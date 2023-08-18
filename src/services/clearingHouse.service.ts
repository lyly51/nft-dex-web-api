import prisma from "../helpers/client";
import { Service } from "typedi";
import { Prisma, Position } from "@prisma/client";

const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

@Service()
export class ClearingHouseService {
  async currentPosition(trader: string, amm: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
        },
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async firstPosition(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        syncId
      },
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }

  async positionAtTime(trader: string, amm: string, timestamp: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
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

  async positionAtTimestampIndex(trader: string, amm: string, timestampIndex: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
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

  async allAmmPositionAfter(trader: string, timestamp: number) {
    return prisma.position.findMany({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        timestamp: {
          gte: timestamp
        },
        syncId
      },
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }

  async allPositions(trader: string) {
    trader = trader.toLowerCase();
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      WHERE ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" group by "ammAddress", "userAddress", "syncId"
      HAVING "userAddress" = ${trader}
      AND "syncId" = ${syncId}
      )
      AND "syncId" = ${syncId}
      `;
  }

  async allPositionsAtTime(trader: string, timestamp: number) {
    trader = trader.toLowerCase();
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      where ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" 
      where "Position"."timestamp" <= ${timestamp}
      group by "ammAddress", "userAddress", "syncId"
      having "userAddress" = ${trader}
      AND "syncId" = ${syncId}
      )
      AND "syncId" = ${syncId}
      `;
  }

  async latestAmmRecord(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address.toLowerCase()
        }
      },
      orderBy: {
        updateTime: "desc"
      }
    });
  }

  async positions(limit: number, offset: number) {
    return prisma.position.findMany({
      take: limit,
      skip: offset,
      where: {
        syncId
      },
      orderBy: [
        {
          timestampIndex: "asc"
        }
      ]
    });
  }

  async tradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm.toLowerCase()
        },
        index: {
          equals: index
        },
        resolution: {
          equals: resolution
        },
        syncId
      },
      orderBy: [
        {
          index: "desc"
        }
      ]
    });
  }

  async previousTradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm.toLowerCase()
        },
        index: {
          lt: index
        },
        resolution: {
          equals: resolution
        },
        syncId
      },
      orderBy: [
        {
          index: "desc"
        }
      ]
    });
  }

  async allAmmTradeDataAfter(timestamp: number, resolution: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp
        },
        resolution: {
          equals: resolution
        },
        syncId
      },
      orderBy: [
        {
          startTimestamp: "asc"
        }
      ]
    });
  }

  async ammTradeDataByTime(timestamp: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp
        },
        endTimestamp: {
          lt: timestamp
        },
        syncId
      },
      orderBy: [
        {
          startTimestamp: "asc"
        }
      ]
    });
  }

  async allTethBalanceHistory(userAddress: string) {
    return prisma.tethBalanceHistory.findMany({
      where: {
        userAddress: userAddress.toLowerCase()
      },
      orderBy: {
        timestamp: "asc"
      }
    });
  }

  async getLatestTethBalanceHistory(userAddress: string) {
    return prisma.tethBalanceHistory.findFirst({
      where: {
        userAddress: userAddress.toLowerCase()
      },
      orderBy: {
        timestamp: "desc"
      }
    });
  }

  async getTethBalanceHistoryByTime(userAddress: string, timestamp: number) {
    return prisma.tethBalanceHistory.findFirst({
      where: {
        userAddress: userAddress.toLowerCase(),
        timestamp: {
          lte: timestamp
        }
      },
      orderBy: {
        timestamp: "desc"
      }
    });
  }

  async createManyTethBalanceHistory(addresses: string[], amounts: string[]) {
    const data = addresses.map((address, index) => {
      return {
        userAddress: address.toLowerCase(),
        balance: amounts[index],
        timestamp: 1600000000
      };
    });
    return prisma.tethBalanceHistory.createMany({
      data
    });
  }

  async getCurrentPositionHistory(trader: string, amm: string) {
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
    WHERE "Position"."batchId" =
    (SELECT "Position"."batchId" FROM api."Position"
    WHERE "userAddress" = ${trader.toLowerCase()}
    AND "ammAddress" = ${amm.toLowerCase()}
    AND "syncId" = ${syncId}
    ORDER BY "Position"."timestampIndex" desc
    LIMIT 1
    )
    AND "action" != 'AdjustMargin'
    AND "syncId" = ${syncId}
    ORDER BY "Position"."timestampIndex" asc`;
  }

  async getLatestTradeRecord(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: trader.toLowerCase(),
        action: "Trade",
        syncId
      }
    });
  }

  async getLatestPartialCloseRecord(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: trader.toLowerCase(),
        action: "Trade",
        syncId,
        OR: [
          {
            size: {
              gt: 0
            },
            exchangedPositionSize: {
              lt: 0
            }
          },
          {
            size: {
              lt: 0
            },
            exchangedPositionSize: {
              gt: 0
            }
          }
        ]
      }
    });
  }

  async getTradeHistory(trader: string, limit: number, offset: number) {
    return prisma.position.findMany({
      where: {
        userAddress: trader.toLowerCase(),
        syncId
      },
      orderBy: {
        timestampIndex: "desc"
      },
      take: limit,
      skip: offset
    });
  }

  async getTradeHistoryAfter(trader: string, timestamp: number) {
    return prisma.position.findMany({
      where: {
        userAddress: trader.toLowerCase(),
        timestamp: {gte: timestamp},
        syncId
      },
      orderBy: {
        timestampIndex: "asc"
      },
    });
  }

  async getPositionFundingPaymentHistoryAfter(trader: string, timestamp: number) {
    return prisma.positionFundingPaymentHistory.findMany({
      where: {
        userAddress: trader.toLowerCase(),
        timestamp: {gte: timestamp},
        syncId
      },
      orderBy: {
        timestamp: "asc"
      },
    });
  }

  async getLatestUpdatedPositionBlockNumber() {
    let record = await prisma.aggregateJob.findFirst({
      where: {
        syncId
      }
    });
    return record ? record.positionChangedEventLastUpdatedBlockNumber : 0;
  }
}
