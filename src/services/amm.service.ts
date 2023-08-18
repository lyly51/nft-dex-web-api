import { AmmFundingPayment, AmmReserve, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import { Service } from "typedi";
import prisma from "../helpers/client";

const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

@Service()
export class AmmService {
  async amm(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address,
          mode: "insensitive"
        }
      }
    });
  }

  async allAmms() {
    return prisma.amm.findMany({
      orderBy: {
        sortOrder: "asc"
      }
    });
  }

  async latestAmmRecord(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address,
          mode: "insensitive"
        }
      },
      orderBy: {
        updateTime: "desc"
      }
    });
  }

  async firstAmmReserves(address: string) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address
        },
        syncId
      },
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }

  async latestAmmReserves(address: string) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async ammReservesAfter(address: string, timestamp) {
    return prisma.ammReserve.findMany({
      where: {
        ammAddress: {
          equals: address
        },
        timestamp: {
          lte: timestamp
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async ammReservesAtTime(address: string, timestamp) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address
        },
        timestamp: {
          lte: timestamp
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async allLatestAmmReserves() {
    return prisma.$queryRaw<AmmReserve[]>`SELECT * FROM api."AmmReserve" 
    WHERE ("AmmReserve"."ammAddress", "AmmReserve"."timestampIndex") in 
   (SELECT "AmmReserve"."ammAddress", max("AmmReserve"."timestampIndex") 
   FROM api."AmmReserve"
   WHERE "AmmReserve"."syncId" = ${syncId}
   group by "ammAddress")
   AND "AmmReserve"."syncId" = ${syncId}
   `;
  }

  async allAmmReservesByTime(timestamp: number) {
    return prisma.$queryRaw<AmmReserve[]>`SELECT * FROM api."AmmReserve" 
    WHERE ("AmmReserve"."ammAddress", "AmmReserve"."timestampIndex") in 
   (SELECT "AmmReserve"."ammAddress", max("AmmReserve"."timestampIndex") 
   FROM api."AmmReserve"
   WHERE timestamp <= ${timestamp}
   AND "AmmReserve"."syncId" = ${syncId}
   group by "ammAddress")
   AND "AmmReserve"."syncId" = ${syncId}
   `;
  }

  async allLatestFundingPayments() {
    return prisma.$queryRaw<AmmFundingPayment[]>`SELECT * FROM api."AmmFundingPayment" 
    WHERE ("AmmFundingPayment"."ammAddress", "AmmFundingPayment"."timestampIndex") in 
    (SELECT "AmmFundingPayment"."ammAddress", max("AmmFundingPayment"."timestampIndex")
    FROM api."AmmFundingPayment"
    WHERE "AmmFundingPayment"."syncId" = ${syncId}
    group by "ammAddress")
    AND "AmmFundingPayment"."syncId" = ${syncId}
    `;
  }

  async allFundingPaymentsByTime(timestamp: number) {
    return prisma.$queryRaw<AmmFundingPayment[]>`SELECT * FROM api."AmmFundingPayment" 
    WHERE ("AmmFundingPayment"."ammAddress", "AmmFundingPayment"."timestampIndex") in 
    (SELECT "AmmFundingPayment"."ammAddress", max("AmmFundingPayment"."timestampIndex") 
    FROM api."AmmFundingPayment"
    WHERE timestamp <= ${timestamp} 
    AND "AmmFundingPayment"."syncId" = ${syncId}
    group by "ammAddress")
    AND "AmmFundingPayment"."syncId" = ${syncId}
    `;
  }

  async ammReserveByTimestampIndex(address: string, timestampIndex: Prisma.Decimal) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address
        },
        timestampIndex: {
          lte: timestampIndex
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async ammFundingPaymentsInRange(address: string, startTimestampIndex: Prisma.Decimal, endTimestampIndex: Prisma.Decimal) {
    return prisma.ammFundingPayment.findMany({
      where: {
        ammAddress: {
          equals: address
        },
        timestampIndex: {
          gte: startTimestampIndex,
          lte: endTimestampIndex
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async ammFundingPaymentsBefore(address: string, timestampIndex: Decimal) {
    return prisma.ammFundingPayment.findMany({
      where: {
        ammAddress: {
          equals: address
        },
        timestampIndex: {
          lte: timestampIndex
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async allFundingPaymentsAfter(address: string, timestampIndex: Prisma.Decimal) {
    return prisma.ammFundingPayment.findMany({
      where: {
        ammAddress: {
          equals: address.toLowerCase()
        },
        timestampIndex: {
          gt: timestampIndex
        },
        syncId
      },
      distinct: ["timestamp"],
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }
}
