import { Position } from "@prisma/client";
import { BigNumber, utils } from "ethers";

export const enum Dir {
  addToAmm,
  removeFromAmm,
}

export function getInputPriceWithReserves(
  directionOfQuote: Dir,
  quoteAssetAmount: BigNumber,
  quoteAssetPoolAmount: BigNumber,
  baseAssetPoolAmount: BigNumber
): BigNumber {
  if (quoteAssetAmount.eq(0)) return BigNumber.from("0");

  let isAddToAmm: boolean = directionOfQuote == Dir.addToAmm;
  let baseAssetAfter: BigNumber;
  let quoteAssetAfter: BigNumber;
  let baseAssetBought: BigNumber;

  if (isAddToAmm) {
    quoteAssetAfter = quoteAssetPoolAmount.add(quoteAssetAmount);
  } else {
    quoteAssetAfter = quoteAssetPoolAmount.sub(quoteAssetAmount);
  }
  if (quoteAssetAfter.isZero()) {
    throw Error("quote asset after is 0");
  }

  baseAssetAfter = quoteAssetPoolAmount
    .mul(baseAssetPoolAmount)
    .div(quoteAssetAfter);
  baseAssetBought = baseAssetAfter.sub(baseAssetPoolAmount).abs();

  if (
    quoteAssetPoolAmount.mul(baseAssetPoolAmount).mod(quoteAssetAfter).gt(0)
  ) {
    if (isAddToAmm) {
      baseAssetBought = baseAssetBought.sub(1);
    } else {
      baseAssetBought = baseAssetBought.add(1);
    }
  }

  return baseAssetBought;
}

export function getOutputPriceWithReserves(
  directionOfBase: Dir,
  baseAssetAmount: BigNumber,
  quoteAssetPoolAmount: BigNumber,
  baseAssetPoolAmount: BigNumber
): BigNumber {
  let isAddToAmm: boolean = directionOfBase == Dir.addToAmm;
  let quoteAssetAfter: BigNumber;
  let baseAssetAfter: BigNumber;
  let quoteAssetSold: BigNumber;

  if (isAddToAmm) {
    baseAssetAfter = baseAssetPoolAmount.add(baseAssetAmount);
  } else {
    baseAssetAfter = baseAssetPoolAmount.sub(baseAssetAmount);
  }
  if (baseAssetAfter.isZero()) {
    throw Error("base asset after is 0");
  }

  quoteAssetAfter = quoteAssetPoolAmount
    .mul(baseAssetPoolAmount)
    .div(baseAssetAfter);
  quoteAssetSold = quoteAssetAfter.sub(quoteAssetPoolAmount).abs();

  if (quoteAssetPoolAmount.mul(baseAssetPoolAmount).mod(baseAssetAfter).gt(0)) {
    if (isAddToAmm) {
      quoteAssetSold = quoteAssetSold.sub(1);
    } else {
      quoteAssetSold = quoteAssetSold.add(1);
    }
  }

  return quoteAssetSold;
}

export function getPositionNotionalAndUnrealizedPnl(
  openNotional: BigNumber,
  size: BigNumber,
  quoteAssetPoolAmount: BigNumber,
  baseAssetPoolAmount: BigNumber
): [BigNumber, BigNumber] {
  let isShort = size.lt(0);
  let dir: Dir = isShort ? Dir.removeFromAmm : Dir.addToAmm;
  let positionNotional = getOutputPriceWithReserves(
    dir,
    size.abs(),
    quoteAssetPoolAmount,
    baseAssetPoolAmount
  );

  let unrealizedPnl = isShort
    ? openNotional.sub(positionNotional)
    : positionNotional.sub(openNotional);

  return [positionNotional, unrealizedPnl];
}

export function getPortfolioCollateralValue(
  position: Position,
  quoteAssetReserve: BigNumber,
  baseAssetReserve: BigNumber,
  latestCumulativePremiumFraction: BigNumber
): BigNumber {
  if (position.size.eq(0)) return BigNumber.from(0);
  let [_, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(
    BigNumber.from(position.openNotional.toString()),
    BigNumber.from(position.size.toString()),
    quoteAssetReserve,
    baseAssetReserve
  );
  let fundingPayment = getFundingPayment(
    BigNumber.from(position.size.toString()),
    BigNumber.from(position.lastUpdatedCumulativePremiumFraction.toString()),
    latestCumulativePremiumFraction
  );
  return BigNumber.from(position.margin.toString())
    .add(unrealizedPnl)
    .sub(fundingPayment);
}

export function getTotalAccountValue(
  position: Position,
  quoteAssetReserve: BigNumber,
  baseAssetReserve: BigNumber,
  latestCumulativePremiumFraction: BigNumber
): BigNumber {
  let [_, unrealizedPnl] = position.size.eq(0)
    ? [0, BigNumber.from(0)]
    : getPositionNotionalAndUnrealizedPnl(
        BigNumber.from(position.openNotional.toString()),
        BigNumber.from(position.size.toString()),
        quoteAssetReserve,
        baseAssetReserve
      );
  let fundingPayment = position.size.eq(0)
    ? BigNumber.from(0)
    : getFundingPayment(
        BigNumber.from(position.size.toString()),
        BigNumber.from(
          position.lastUpdatedCumulativePremiumFraction.toString()
        ),
        latestCumulativePremiumFraction
      );
  return BigNumber.from(position.cumulativeRealizedPnl.toString())
    .add(unrealizedPnl)
    .sub(fundingPayment)
    .sub(BigNumber.from(position.cumulativeFundingPayment.toString()))
    .sub(BigNumber.from(position.cumulativeFee.toString()))
    .sub(BigNumber.from(position.cumulativeLiquidationPenalty.toString()))
    .sub(BigNumber.from(position.cumulativeFullLiquidationRealizedPnl.toString()))
    .add(BigNumber.from(position.cumulativeFullLiquidationFundingPayment.toString()))
    ;
}

export function getPriceChangePnl(
  position: Position,
  quoteAssetReserve: BigNumber,
  baseAssetReserve: BigNumber,
): BigNumber {
  let [_, unrealizedPnl] = position.size.eq(0)
    ? [0, BigNumber.from(0)]
    : getPositionNotionalAndUnrealizedPnl(
        BigNumber.from(position.openNotional.toString()),
        BigNumber.from(position.size.toString()),
        quoteAssetReserve,
        baseAssetReserve
      );
  return BigNumber.from(position.cumulativeRealizedPnl.toString())
    .add(unrealizedPnl)
}

export function getFundingPayment(
  size: BigNumber,
  lastUpdatedCumulativePremiumFraction: BigNumber,
  latestCumulativePremiumFraction: BigNumber
): BigNumber {
  return size
    .mul(
      latestCumulativePremiumFraction.sub(lastUpdatedCumulativePremiumFraction)
    )
    .div(utils.parseEther("1"));
}

export function getRemainMarginWithFundingPayment(
  position: Position,
  unrealizedPnl: BigNumber,
  latestCumulativePremiumFraction: BigNumber
): BigNumber {
  let fundingPayment = getFundingPayment(
    BigNumber.from(position.size.toString()),
    BigNumber.from(position.lastUpdatedCumulativePremiumFraction.toString()),
    latestCumulativePremiumFraction
  );

  let signedRemainMargin = unrealizedPnl
    .sub(fundingPayment)
    .add(BigNumber.from(position.margin.toString()));

  return signedRemainMargin; // Negative means bad debt
}

export function getMarginRatio(
  position: Position,
  quoteAssetPoolAmount: BigNumber,
  baseAssetPoolAmount: BigNumber,
  latestCumulativePremiumFraction: BigNumber
) {
  let [positionNotional, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(
    BigNumber.from(position.openNotional.toString()),
    BigNumber.from(position.size.toString()),
    quoteAssetPoolAmount,
    baseAssetPoolAmount
  );

  let remainMargin = getRemainMarginWithFundingPayment(
    position,
    unrealizedPnl,
    latestCumulativePremiumFraction
  );

  return remainMargin.mul(utils.parseEther("1")).div(positionNotional);
}
