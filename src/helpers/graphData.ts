import { Position } from "@prisma/client";
import { BigNumber, utils } from "ethers";
import { toBN } from "./decimalHelper";

export class GraphData {
  constructor(
    private time: number,
    private totalAccountValue: BigNumber,
    private portfolioCollateralValue: BigNumber,
    private positionCount: number,
  ) {}

  getTime() {
    return this.time;
  }
  getPortfolioCollateralValue() {
    return this.portfolioCollateralValue;
  }
  getTotalAccountValue() {
    return this.totalAccountValue;
  }

  toObject() {
    return {
      time: this.time,
      totalAccountValue: this.totalAccountValue.toString(),
      portfolioCollateralValue: this.portfolioCollateralValue.toString(),
      positionCount: this.positionCount,
    };
  }
}
