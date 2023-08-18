import prisma from "../helpers/client";
import { Service } from "typedi";
import { CompetitionSeason1, Position } from "@prisma/client";

const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

@Service()
export class CompetitionService {
  async getAbsPnlLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "absolutePnl" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."absolutePnl" as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY "absolutePnl" DESC
    LIMIT 500
    OFFSET ${(page - 1) * 500}
    `;
  }

  async getNetConvergenceVolLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY cs."netConvergenceVolume" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."netConvergenceVolume" as "netConvergenceVol", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY cs."netConvergenceVolume" DESC
    LIMIT 500
    OFFSET ${(page - 1) * 500}
    `;
  }

  async getRealisedPnlLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY cs."roi" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."roi" * 100 as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY cs."roi" DESC
    LIMIT 500
    OFFSET ${(page - 1) * 500}
    `;
  }

  async getTopLoserLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "absolutePnl" ASC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."absolutePnl" as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY "absolutePnl" ASC
    LIMIT 500
    OFFSET ${(page - 1) * 500}
    `;
  }

  async getPersonalLeaderboardRecord(userAddress: string) {
    return prisma.$queryRaw<any[]>`
    SELECT u."username", cs."userAddress", cs."absolutePnl", cs."netConvergenceVolume", cs."roi" * 100 as "roi", cs."tradedVolume"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."userAddress" = ${userAddress.toLowerCase()}
    `;
  }

  // Season 2
  async getS2AbsPnlLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "absolutePnl" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."absolutePnl" as "pnl"
    FROM api."CompetitionSeason2" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" ORDER BY "updatedIndex" DESC LIMIT 1)
    ORDER BY "absolutePnl" DESC
    LIMIT 2000
    OFFSET ${(page - 1) * 2000}
    `;
  }

  async getS2FundingPaymentLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "fundingPayment" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."fundingPayment" as "fundingPayment"
    FROM api."CompetitionSeason2" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" ORDER BY "updatedIndex" DESC LIMIT 1)
    ORDER BY "fundingPayment" DESC
    LIMIT 2000
    OFFSET ${(page - 1) * 2000}
    `;
  }

  async getS2TradedVolumeLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "weeklyTradedVolume" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."weeklyTradedVolume" as "weeklyTradedVolume"
    FROM api."CompetitionSeason2" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."weeklyTradedVolume" > 0
    ORDER BY "weeklyTradedVolume" DESC
    LIMIT 2000
    OFFSET ${(page - 1) * 2000}
    `;
  }

  async getS2TradedVolumeLeaderboardByWeek(page: number = 1, week: number = 1) {
    if (page < 1) {
      page = 1;
    }
    if (week < 0) {
      week = 0;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "weeklyTradedVolume" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."weeklyTradedVolume" as "weeklyTradedVolume"
    FROM api."CompetitionSeason2" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" WHERE "week" = ${week} ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."week" = ${week}
    AND cs."weeklyTradedVolume" > 0
    ORDER BY "weeklyTradedVolume" DESC
    LIMIT 2000
    OFFSET ${(page - 1) * 2000}
    `;
  }

  async getS2RefereeTradedVolumeLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY SUM("tradedVolume") DESC) AS "rank", "referer" as "userAddress", MAX("refererName") as "username", SUM("tradedVolume") as "totalVolume", MAX("countReferralCode") as "refereeCount" FROM
    (SELECT re."userAddress" as "referee", ui."userAddress" as "referer", ui."username" as "refererName", ui."countReferralCode" FROM api."ReferralEvents" re LEFT JOIN api."UserInfo" ui
    ON re."referralCode" = ui."referralCode") q1
    LEFT JOIN api."CompetitionSeason2" cs2 ON cs2."userAddress" = q1."referee"
    WHERE "updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" ORDER BY "updatedIndex" DESC LIMIT 1)
    GROUP BY "referer"
    HAVING SUM("tradedVolume") > 0
    ORDER BY "totalVolume" DESC   
    LIMIT 2000
    OFFSET ${(page - 1) * 2000}
    `;
  }

  async getS2RefererTeamList(userAddress: string) {
    return prisma.$queryRaw<any[]>`
    SELECT referee as "userAddress", ui2."username" as "username", COALESCE("tradedVolume",0) as "tradedVolume" FROM
    (SELECT re."userAddress" as "referee", ui."userAddress" as "referer", ui."username" as "refererName", ui."countReferralCode" FROM api."ReferralEvents" re LEFT JOIN api."UserInfo" ui
    ON re."referralCode" = ui."referralCode") q1
    LEFT OUTER JOIN api."CompetitionSeason2" cs2 ON cs2."userAddress" = q1."referee"
    LEFT JOIN api."UserInfo" ui2 ON "referee" = ui2."userAddress"
    WHERE ("updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason2" ORDER BY "updatedIndex" DESC LIMIT 1) OR "updatedIndex" IS NULL)
    AND "referer" = ${userAddress.toLowerCase()}
    ORDER BY COALESCE("tradedVolume",0) DESC
    `;
  }
}
