import { Prisma } from "@prisma/client";
import { BigNumber } from "ethers";

export function toBN(decimal: Prisma.Decimal): BigNumber {
  return BigNumber.from(decimal.toString());
}
