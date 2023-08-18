import { Service } from "typedi";
import prisma from "../helpers/client";
import { Prisma, UserInfo } from "@prisma/client";
import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
import { Decimal } from "@prisma/client/runtime";
import { BigNumber, ethers, utils } from "ethers";
import { PointsService } from "./points.service";
import axios from "axios";
import { CompetitionService } from "./competition.service";
import { BigNumber as BigNumber1 } from "bignumber.js";

const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

type Follower = { followerAddress: string; followers: number; ranking: number; points: number; userAddress: string };
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
@Service()
export class UserService {
  private competitionService;
  private amms;
  constructor(private pointService: PointsService) {
    this.competitionService = new CompetitionService()
    let ammEnv = process.env.AMM_ENV;
    console.log(`ammEnv:${ammEnv}`)
    this.competitionService = new CompetitionService()
    if (ammEnv == 'production') {
      // prod
      this.amms = {
        "wcryptopunks": '0x2396cc2b3c814609daeb7413b7680f569bbc16e0',
        "bayc": '0xd490246758b4dfed5fb8576cb9ac20073bb111dd',
        "azuki": '0xf33c2f463d5ad0e5983181b49a2d9b7b29032085',
        "mayc": '0x75416ee73fd8c99c1aa33e1e1180e8ed77d4c715',
        "degods": '0x1bbc1f49497f4f1a08a93df26adfc7b0cecd95e0',
        "thecaptiainz": '0xcba1f8cdd6c9d6ea71b3d88dcfb777be9bc7c737',
        "pudgypenguins": '0x0e9148000cc4368a5c091d85e5aa91596408594d',
        "milady": '0x64244464a3e15990299d4106deca4f4839f3dd99'
      }
    } else {
      // dev
      this.amms = {
        "wcryptopunks": '0xfdee694ab487321a205ff077c757692ea172aafc',
        "bayc": '0x1812dbda7a954e829a6ada968cee0d3f315ddba2',
        "azuki": '0x77eb2f64a0a94b98283060d35645e6e2eade029c',
        "mayc": '0xf7749f92627985afde9bc8577a66cadc3e055589',
        "degods": '0x6aad9d74c2a9c0a185fc08adee633ab6a6968375',
        "thecaptiainz": '0x0c237df9af7c2246001c30e632839efb7c58a2f4',
        "pudgypenguins": '0x99cdbb85154be3a2eb1876aead11d78cd9c17034',
        "milady": '0x98347f01b6b023bfbeb4b534cc48d43f2cfb562b'
      }
    }
  }
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: data
    });
  }

  async fetchUserSocialProfile(userAddress: string) {
    // ps.timestamp >= 1686042000 AND ps.timestamp < 1689498000
    let ammAddressList: string[] = Object.values(this.amms)
    let totalTradesResult = await prisma.position.count({
      where: {
        AND: [
          { userAddress: userAddress },
          { size: { equals: 0 } },
          {
            ammAddress: { in: ammAddressList },
          },
          {
            timestamp: {
              gte: 1686042000
            }
          }, {
            timestamp: {
              lte: 1689498000
            }
          }
        ]
      }
    })
    
    let totalCloseTradeResult = await prisma.$queryRaw<any[]>`SELECT CASE WHEN SUM(totaltrades.trades) isnull THEN 0 ELSE SUM(totaltrades.trades) END AS "totalTrades" FROM (SELECT "userAddress" AS "userAddress", COUNT("userAddress") AS trades 
    FROM "Position" WHERE ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) AND "syncId" = ${syncId} AND "userAddress" = ${userAddress} AND size = 0 AND "ammAddress" IN (${Prisma.join(ammAddressList)}) GROUP BY "userAddress","batchId") totaltrades`
    let highTrades = await prisma.$queryRaw<any[]>`SELECT  t."culRealizedPnl" AS "realizedPnl", p."openTime" AS "openTime", p."period" AS "period", t."ammAddress" AS "ammAddress" 
    FROM (
        SELECT  ps."ammAddress" AS "ammAddress",
            ps."batchId" AS "batchId",
            (ps."positionCumulativeRealizedPnl" - ps."positionCumulativeFundingPayment") AS "culRealizedPnl"
        FROM "Position" ps
        WHERE ps."userAddress" = ${userAddress} AND ps."size" = 0 AND ps."syncId" = 1 AND (ps."timestamp" >= 1686042000 AND ps."timestamp" < 1689498000) AND (ps."positionCumulativeRealizedPnl" - ps."positionCumulativeFundingPayment") > 0 ORDER BY "culRealizedPnl" DESC LIMIT 3
    ) t
    LEFT JOIN (SELECT ps."batchId" AS "batchId", MIN(ps."timestamp") AS "openTime", MAX(ps."timestamp") - MIN(ps."timestamp") AS "period" FROM "Position" ps GROUP BY ps."userAddress", ps."ammAddress", ps."batchId") p
    ON p."batchId" = t."batchId"`;
    let lowestTrades = await prisma.$queryRaw<any[]>`SELECT  t."culRealizedPnl" AS "realizedPnl", p."openTime" AS "openTime", p."period" AS "period", t."ammAddress" AS "ammAddress" 
    FROM (
        SELECT  ps."ammAddress" AS "ammAddress",
            ps."batchId" AS "batchId",
            (ps."positionCumulativeRealizedPnl" - ps."positionCumulativeFundingPayment")  AS "culRealizedPnl"
        FROM "Position" ps
        WHERE ps."userAddress" = ${userAddress} AND ps."size" = 0 AND ps."syncId" = 1 AND (ps."timestamp" >= 1686042000 AND ps."timestamp" < 1689498000) AND (ps."positionCumulativeRealizedPnl" - ps."positionCumulativeFundingPayment") < 0 ORDER BY "culRealizedPnl" ASC LIMIT 3
    ) t
    LEFT JOIN (SELECT ps."batchId" AS "batchId", MIN(ps."timestamp") AS "openTime", MAX(ps."timestamp") - MIN(ps."timestamp") AS "period" FROM "Position" ps GROUP BY ps."userAddress", ps."ammAddress", ps."batchId") p
    ON p."batchId" = t."batchId"`;
    let tradeVolResult = await prisma.$queryRaw<any[]>`SELECT CASE WHEN SUM("positionNotional") / (10^18)  isnull THEN 0 ELSE SUM("positionNotional") / (10^18) END AS "tradeVolTotal" FROM api."Position" WHERE "userAddress" = ${userAddress} AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND action='Trade' AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) AND "syncId" = ${syncId}`
    let avgLeverageResult = await prisma.$queryRaw<any[]>`SELECT SUM(a."avgLeverage") / count(a."avgLeverage") AS "avgLeverage" FROM (SELECT CASE WHEN (t.amount + t."fundingPayment") = 0 OR t."positionNotional" / (t.amount + t."fundingPayment") isnull THEN 0 ELSE t."positionNotional" / (t.amount + t."fundingPayment") END AS "avgLeverage" 
    FROM
    (SELECT id, "openNotional", "margin", amount, "fundingPayment", "positionNotional",
      CASE 
        WHEN "exchangedPositionSize" = "size" AND "exchangedPositionSize" > 0 AND "size" > 0 
        THEN true 
        ELSE false 
        END AS "isOpen",
      CASE
        WHEN SIGN("exchangedPositionSize") = SIGN("size")
        THEN true
        ELSE false
        END AS "isAdd"
      FROM api."Position" WHERE "userAddress" = ${userAddress} AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) AND "syncId" = ${syncId}
    ) t WHERE t."isOpen" = true OR t."isAdd" = true ) a WHERE a."avgLeverage" > 0`
    
    let pnlResult = await prisma.$queryRaw<any[]>`WITH "totalFundingPaymentResult" AS (SELECT round(SUM("fundingPayment")) AS "totalFundingPayment", "userAddress" FROM api."PositionFundingPaymentHistory"  WHERE "userAddress" = ${userAddress} AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) GROUP BY "userAddress")
                                                  SELECT CASE WHEN (SUM("realizedPnl") + (SELECT "totalFundingPayment" FROM "totalFundingPaymentResult")) / (10^18) isnull THEN 0 ELSE (SUM("realizedPnl") + (SELECT "totalFundingPayment" FROM "totalFundingPaymentResult")) / (10^18) END AS pnl
                                                  FROM api."Position" ps 
                                                  WHERE ps."userAddress" = ${userAddress} AND ps."syncId" = ${syncId} AND (ps."timestamp" >= 1686042000 AND ps."timestamp" < 1689498000)`
    let collectionsWinRateResult = await prisma.$queryRaw<any[]>`
    SELECT
      CASE
        WHEN p.wcryptopunks_gt = 0 OR c.wcryptopunks_total = 0 THEN '0' ELSE p.wcryptopunks_gt::varchar || '/' || c.wcryptopunks_total::varchar END AS "wcryptopunksWinRate",
      CASE
        WHEN p.wcryptopunks_gt = 0 OR c.wcryptopunks_total = 0 THEN 0 ELSE p.wcryptopunks_gt / c.wcryptopunks_total END AS "wcryptopunksWinRateNum",
      CASE
        WHEN p.bayc_gt = 0 OR c.bayc_total = 0 THEN '0' ELSE p.bayc_gt::varchar || '/' || c.bayc_total::varchar END AS "baycWinRate",
      CASE
        WHEN p.bayc_gt = 0 OR c.bayc_total = 0 THEN 0 ELSE p.bayc_gt / c.bayc_total END AS "baycWinRateNum",
      CASE
        WHEN p.azuki_gt = 0 OR c.azuki_total = 0 THEN '0' ELSE p.azuki_gt::varchar || '/' || c.azuki_total::varchar END AS "azukiWinRate",
      CASE
        WHEN p.azuki_gt = 0 OR c.azuki_total = 0 THEN 0 ELSE p.azuki_gt / c.azuki_total END AS "azukiWinRateNum",
      CASE
        WHEN p.mayc_gt = 0 OR c.mayc_total = 0 THEN '0' ELSE p.mayc_gt::varchar || '/' || c.mayc_total::varchar END AS "maycWinRate",
      CASE
        WHEN p.mayc_gt = 0 OR c.mayc_total = 0 THEN 0 ELSE p.mayc_gt / c.mayc_total END AS "maycWinRateNum",
      CASE	
        WHEN p.degods_gt = 0 OR c.degods_total = 0 THEN '0' ELSE p.degods_gt::varchar || '/' || c.degods_total::varchar END AS "degodsWinRate",
      CASE	
        WHEN p.degods_gt = 0 OR c.degods_total = 0 THEN 0 ELSE p.degods_gt / c.degods_total END AS "degodsWinRateNum",
      CASE	
        WHEN p.thecaptiainz_gt = 0 OR c.thecaptiainz_total = 0 THEN '0' ELSE p.thecaptiainz_gt::varchar || '/' || c.thecaptiainz_total::varchar END AS "thecaptiainzWinRate",
      CASE	
        WHEN p.thecaptiainz_gt = 0 OR c.thecaptiainz_total = 0 THEN 0 ELSE p.thecaptiainz_gt / c.thecaptiainz_total END AS "thecaptiainzWinRateNum",
      CASE	
        WHEN p.pudgypenguins_gt = 0 OR c.pudgypenguins_total = 0 THEN '0' ELSE p.pudgypenguins_gt::varchar || '/' || c.pudgypenguins_total::varchar END AS "pudgypenguinsWinRate",
      CASE	
        WHEN p.pudgypenguins_gt = 0 OR c.pudgypenguins_total = 0 THEN 0 ELSE p.pudgypenguins_gt / c.pudgypenguins_total END AS "pudgypenguinsWinRateNum",
      CASE		
        WHEN p.milady_gt = 0 OR c.milady_total = 0 THEN '0' ELSE p.milady_gt::varchar || '/' || c.milady_total::varchar END AS "miladyWinRate",
      CASE		
        WHEN p.milady_gt = 0 OR c.milady_total = 0 THEN 0 ELSE p.milady_gt / c.milady_total END AS "miladyWinRateNum"			     
    FROM (
        SELECT t."userAddress" 			 AS "userAddress",
          SUM(wcryptopunks_total)    AS wcryptopunks_total,
          SUM(bayc_total) 		       AS bayc_total,
          SUM(azuki_total) 		       AS azuki_total,
          SUM(mayc_total) 		       AS mayc_total,
          SUM(degods_total) 		     AS degods_total,
          SUM(thecaptiainz_total)    AS thecaptiainz_total, 
          SUM(pudgypenguins_total)   AS pudgypenguins_total, 
          SUM(milady_total) 		     AS milady_total
        FROM (SELECT "userAddress", 
                CASE 
                  WHEN "ammAddress" = ${this.amms.wcryptopunks} THEN COUNT("ammAddress") ELSE 0 END AS wcryptopunks_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.bayc} THEN COUNT("ammAddress") ELSE 0 END AS bayc_total,
                CASE	
                  WHEN "ammAddress" = ${this.amms.azuki} THEN COUNT("ammAddress") ELSE 0 END AS azuki_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.mayc} THEN COUNT("ammAddress") ELSE 0 END AS mayc_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.degods} THEN COUNT("ammAddress") ELSE 0 END AS degods_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.thecaptiainz} THEN COUNT("ammAddress") ELSE 0 END AS thecaptiainz_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.pudgypenguins} THEN COUNT("ammAddress") ELSE 0 END AS pudgypenguins_total,
                CASE
                  WHEN "ammAddress" = ${this.amms.milady} THEN COUNT("ammAddress") ELSE 0 END AS milady_total
                FROM "Position"
        WHERE "userAddress" = ${userAddress} AND "syncId" = ${syncId} AND size = 0 AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) GROUP BY "userAddress","ammAddress","batchId") t GROUP BY t."userAddress") c
     LEFT JOIN (
        SELECT  g."userAddress" 		  AS "userAddress",
            SUM(wcryptopunks_gt)      AS wcryptopunks_gt,
            SUM(bayc_gt) 		          AS bayc_gt,
            SUM(azuki_gt) 		        AS azuki_gt,
            SUM(mayc_gt) 		  	      AS mayc_gt,
            SUM(degods_gt) 		        AS degods_gt,
            SUM(thecaptiainz_gt)      AS thecaptiainz_gt, 
            SUM(pudgypenguins_gt)     AS pudgypenguins_gt, 
            SUM(milady_gt) 		        AS milady_gt 
          FROM (
              SELECT "userAddress" AS "userAddress",
                CASE 
                  WHEN "ammAddress" = ${this.amms.wcryptopunks} THEN COUNT("ammAddress") ELSE 0 END AS wcryptopunks_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.bayc} THEN COUNT("ammAddress") ELSE 0 END AS bayc_gt,
                CASE	
                  WHEN "ammAddress" = ${this.amms.azuki} THEN COUNT("ammAddress") ELSE 0 END AS azuki_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.mayc} THEN COUNT("ammAddress") ELSE 0 END AS mayc_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.degods} THEN COUNT("ammAddress") ELSE 0 END AS degods_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.thecaptiainz} THEN COUNT("ammAddress") ELSE 0 END AS thecaptiainz_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.pudgypenguins} THEN COUNT("ammAddress") ELSE 0 END AS pudgypenguins_gt,
                CASE
                  WHEN "ammAddress" = ${this.amms.milady} THEN COUNT("ammAddress") ELSE 0 END AS milady_gt 
            FROM "Position" 
            WHERE "userAddress" = ${userAddress} AND "syncId" = ${syncId} AND "ammAddress" IN (${Prisma.join(ammAddressList)})
            AND 
            size = 0 
            AND 
            "positionCumulativeRealizedPnl" > 0 
            AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000)
            GROUP BY "userAddress", "ammAddress", "batchId") g GROUP BY g."userAddress"
        ) p
    ON c."userAddress" = p."userAddress"`
    
    let collectionsOpenNotionalAllocationResult = await prisma.$queryRaw<any[]>`WITH "totalOpenNotionalResult" AS (SELECT SUM(t."positionNotional") AS "totalOpenNotional"
    FROM 
    (SELECT id, "positionNotional",
      CASE 
      WHEN "exchangedPositionSize" = "size" AND "exchangedPositionSize" > 0 AND "size" > 0 
      THEN true 
      ELSE false 
      END AS "isOpen",
      CASE
      WHEN SIGN("exchangedPositionSize") = SIGN("size")
      THEN true
      ELSE false
      END AS "isAdd"
      FROM api."Position" WHERE "userAddress" = ${userAddress} AND "syncId" = ${syncId} AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000)
    ) t WHERE t."isOpen" = true OR t."isAdd" = true)
    SELECT
        SUM(wcryptopunks_pnl)  / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")    AS wcryptopunks_pnl,
        SUM(bayc_pnl) 		     / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")	  AS bayc_pnl,
        SUM(azuki_pnl) 		     / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")	  AS azuki_pnl,
        SUM(mayc_pnl) 		     / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")    AS mayc_pnl,
        SUM(degods_pnl) 		   / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")	  AS degods_pnl,
        SUM(thecaptiainz_pnl)  / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")    AS thecaptiainz_pnl, 
        SUM(pudgypenguins_pnl) / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")    AS pudgypenguins_pnl, 
        SUM(milady_pnl) 		   / (SELECT "totalOpenNotional" FROM "totalOpenNotionalResult")    AS milady_pnl
    FROM (SELECT  t2."userAddress",
	CASE 
		WHEN "ammAddress" = ${this.amms.wcryptopunks} THEN SUM("positionNotional") ELSE 0 END AS wcryptopunks_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.bayc} THEN SUM("positionNotional") ELSE 0 END AS bayc_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.azuki} THEN SUM("positionNotional") ELSE 0 END AS azuki_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.mayc} THEN SUM("positionNotional") ELSE 0 END AS mayc_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.degods} THEN SUM("positionNotional") ELSE 0 END AS degods_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.thecaptiainz} THEN SUM("positionNotional") ELSE 0 END AS thecaptiainz_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.pudgypenguins} THEN SUM("positionNotional") ELSE 0 END AS pudgypenguins_pnl,
	CASE
		WHEN "ammAddress" = ${this.amms.milady} THEN SUM("positionNotional") ELSE 0 END AS milady_pnl
        FROM (SELECT "batchId", "positionNotional", "ammAddress", "isAdd", "isOpen", "userAddress" FROM (SELECT "batchId", "positionNotional", "ammAddress", "userAddress",
		  CASE 
			WHEN "exchangedPositionSize" = "size" AND "exchangedPositionSize" > 0 AND "size" > 0 
			THEN true 
			ELSE false 
		  END AS "isOpen",
		  CASE
			WHEN SIGN("exchangedPositionSize") = SIGN("size")
			THEN true
			ELSE false
		  END AS "isAdd"
      FROM api."Position" WHERE "userAddress" = ${userAddress} AND "syncId" = ${syncId} AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000)) t1 WHERE t1."isOpen" = true OR t1."isAdd" = true) t2
      WHERE t2."isOpen" = true OR t2."isAdd" = true
	  GROUP BY t2."userAddress", t2."ammAddress") t
    GROUP BY t."userAddress"`

    let goodTradeCountResult = await prisma.$queryRaw<any[]>`SELECT "userAddress" AS "userAddress", COUNT("userAddress") AS trades FROM "Position" WHERE "userAddress" = ${userAddress} AND "syncId" = ${syncId} AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND size = 0 AND "positionCumulativeRealizedPnl" > 0 AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000)  GROUP BY "userAddress", "batchId"`
    let collectionsPnlResult = await prisma.$queryRaw<any[]>`SELECT (pnl.wcryptopunks_pnl + fp.wcryptopunks_fp)::varchar AS wcryptopunks_pnl,
                      (pnl.bayc_pnl + fp.bayc_fp)::varchar AS bayc_pnl,
                      (pnl.azuki_pnl + fp.azuki_fp)::varchar AS azuki_pnl,
                      (pnl.mayc_pnl + fp.mayc_fp)::varchar AS mayc_pnl,
                      (pnl.degods_pnl + fp.degods_fp)::varchar AS degods_pnl,
                      (pnl.thecaptiainz_pnl + fp.thecaptiainz_fp)::varchar AS thecaptiainz_pnl,
                      (pnl.pudgypenguins_pnl + fp.pudgypenguins_fp)::varchar AS pudgypenguins_pnl,
                      (pnl.milady_pnl + fp.milady_fp)::varchar AS milady_pnl
                FROM (SELECT "userAddress", 
                    (SUM(wcryptopunks_pnl) / (10^18))             AS wcryptopunks_pnl,
                    (SUM(bayc_pnl)         / (10^18))             AS bayc_pnl,
                    (SUM(azuki_pnl)        / (10^18))             AS azuki_pnl,
                    (SUM(mayc_pnl)         / (10^18))             AS mayc_pnl,
                    (SUM(degods_pnl)       / (10^18))             AS degods_pnl,
                    (SUM(thecaptiainz_pnl) / (10^18))       	  AS thecaptiainz_pnl, 
                    (SUM(pudgypenguins_pnl)/ (10^18))       	  AS pudgypenguins_pnl, 
                    (SUM(milady_pnl)       / (10^18))             AS milady_pnl
                FROM (SELECT "userAddress", 
                      CASE 
                    WHEN "ammAddress" = ${this.amms.wcryptopunks} THEN SUM("realizedPnl") ELSE 0 END AS wcryptopunks_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.bayc} THEN SUM("realizedPnl") ELSE 0 END AS bayc_pnl,
                    CASE	
                    WHEN "ammAddress" = ${this.amms.azuki} THEN SUM("realizedPnl") ELSE 0 END AS azuki_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.mayc} THEN SUM("realizedPnl") ELSE 0 END AS mayc_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.degods} THEN SUM("realizedPnl") ELSE 0 END AS degods_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.thecaptiainz} THEN SUM("realizedPnl") ELSE 0 END AS thecaptiainz_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.pudgypenguins} THEN SUM("realizedPnl") ELSE 0 END AS pudgypenguins_pnl,
                    CASE
                    WHEN "ammAddress" = ${this.amms.milady} THEN SUM("realizedPnl") ELSE 0 END AS milady_pnl
                    FROM api."Position"
                    WHERE "userAddress" = ${userAddress} AND "ammAddress" IN (${Prisma.join(ammAddressList)}) AND ("timestamp" >= 1686042000 AND "timestamp" < 1689498000) GROUP BY "userAddress", "ammAddress"
                  ) t
                GROUP BY t."userAddress") pnl
                LEFT JOIN (SELECT "userAddress",
                    (SUM(wcryptopunks_fp) / (10^18))             AS wcryptopunks_fp,
                    (SUM(bayc_fp)         / (10^18))             AS bayc_fp,
                    (SUM(azuki_fp)        / (10^18))             AS azuki_fp,
                    (SUM(mayc_fp)         / (10^18))             AS mayc_fp,
                    (SUM(degods_fp)       / (10^18))             AS degods_fp,
                    (SUM(thecaptiainz_fp) / (10^18))             AS thecaptiainz_fp, 
                    (SUM(pudgypenguins_fp)/ (10^18))             AS pudgypenguins_fp, 
                    (SUM(milady_fp)       / (10^18))             AS milady_fp
                FROM(SELECT "userAddress",
                      CASE 
                    WHEN "ammAddress" = ${this.amms.wcryptopunks} THEN SUM("fundingPayment") ELSE 0 END AS wcryptopunks_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.bayc} THEN SUM("fundingPayment") ELSE 0 END AS bayc_fp,
                    CASE	
                    WHEN "ammAddress" = ${this.amms.azuki} THEN SUM("fundingPayment") ELSE 0 END AS azuki_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.mayc} THEN SUM("fundingPayment") ELSE 0 END AS mayc_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.degods} THEN SUM("fundingPayment") ELSE 0 END AS degods_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.thecaptiainz} THEN SUM("fundingPayment") ELSE 0 END AS thecaptiainz_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.pudgypenguins} THEN SUM("fundingPayment") ELSE 0 END AS pudgypenguins_fp,
                    CASE
                    WHEN "ammAddress" = ${this.amms.milady} THEN SUM("fundingPayment") ELSE 0 END AS milady_fp
                FROM api."PositionFundingPaymentHistory" WHERE "ammAddress" IN (${Prisma.join(ammAddressList)}) AND "timestamp" >= 1686042000 AND "timestamp" < 1689498000 GROUP BY "userAddress", "ammAddress")
                t WHERE t."userAddress" = ${userAddress} GROUP BY t."userAddress") fp
                ON fp."userAddress" = pnl."userAddress"`

    let goodTradeCount = goodTradeCountResult.length;
    let totalCloseTrades = totalCloseTradeResult.length == 0 ? 0 : totalCloseTradeResult[0].totalTrades
    let totalTradeVol = tradeVolResult.length == 0 ? 0 : tradeVolResult[0].tradeVolTotal
    let avgLeverage = avgLeverageResult.length == 0 ? 0 : avgLeverageResult[0].avgLeverage
    let winRate = goodTradeCount == 0 || totalCloseTrades == 0 ? 0 : goodTradeCount / totalCloseTrades
    let totalPnl = pnlResult.length == 0 ? 0 : pnlResult[0].pnl

    let infoResult = {
      "totalTrades": totalTradesResult.toString(),
      "totalTradingVol": totalTradeVol.toString(),
      "avgLeverage": avgLeverage,
      "winRate": winRate.toString(),
      "totalRealizedPnL": totalPnl.toString()
    }
    let collectionsOpenNotionalAllocation = collectionsOpenNotionalAllocationResult.length == 0 ? {} : collectionsOpenNotionalAllocationResult[0]
    let collectionsWinRate = collectionsWinRateResult.length == 0 ? {} : collectionsWinRateResult[0]
    let collectionsPnl = collectionsPnlResult.length == 0 ? {} : collectionsPnlResult[0]
    let analysis = { "collectionAnalysis": collectionsWinRate, "collectionsPnl": collectionsPnl, "collectionsOpenNotionalAllocation": collectionsOpenNotionalAllocation }
    let trades = { "highest": highTrades, "lowest": lowestTrades }
    let result = { "info": infoResult, "analysis": analysis, "trades": trades }
    return result;
  }

  async fetchFollowAndUpdateUserInfo(userAddress: string) {
    // 获取我追踪的列表
    let followingCount = await prisma.userFollowing.count({ where: { userAddress: userAddress.toLowerCase() } });
    // 获取追踪我的列表
    let followersCount = await prisma.userFollowing.count({ where: { followerAddress: userAddress.toLowerCase() } });

    let result = await prisma.userInfo.update({
      where: { userAddress: userAddress.toLowerCase() },
      data: { followers: followersCount, following: followingCount }
    });
    return result;
  }

  async findByAddress(userAddress: string) {
    return await prisma.user.findUnique({
      where: {
        userAddress: userAddress.toLowerCase()
      }
    });
  }

  async getUserInfo(address: string) {
    return await prisma.userInfo.findFirst({
      where: {
        userAddress: address.toLowerCase()
      }
    });
  }

  async userInfoByReferralCode(referralCode: string) {
    return await prisma.userInfo.findFirst({
      where: {
        referralCode
      }
    });
  }

  async updateUserInfos(data: Prisma.UserInfoUpdateManyArgs) {
    return prisma.userInfo.updateMany(data);
  }

  async getRefererUserInfo(userAddress: string) {
    let info = await prisma.$queryRaw<UserInfo[]>`
    SELECT * FROM api."UserInfo" WHERE "referralCode" = 
    (SELECT "referralCode" FROM api."ReferralEvents" WHERE "userAddress" = 
     ${userAddress.toLowerCase()})
     LIMIT 1
     `;

    return info.length === 1 ? info[0] : null;
  }

  // 保存连接钱包的地址
  async saveConnectWalletAddress(userAddress: string) {
    let haveOne = await prisma.connectHistory.findUnique({ where: { userAddress } });
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (haveOne) {
      return haveOne;
    } else {
      let data = {
        userAddress: userAddress,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let user = await prisma.connectHistory.create({ data: data });
      return user;
    }
  }

  // 查询地址是否连接过
  async fetchConnectWallet(userAddress: string) {
    let haveOne = await prisma.connectHistory.findUnique({ where: { userAddress } });
    return haveOne;
  }

  // 查询地址是不是在whitelist
  async fetchWhitelist(userAddress: string) {
    let haveOne = await prisma.whitelist.findUnique({ where: { userAddress } });
    return haveOne;
  }

  // 将地址加入whitelist
  async saveWhitelist(list: string[]) {
    let datalist = [];
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    for (let i = 0; i < list.length; i++) {
      const address = list[i];
      let data = {
        userAddress: address.toLowerCase(),
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let haveOne = await prisma.whitelist.findUnique({ where: { userAddress: address.toLowerCase() } });
      if (haveOne == null || haveOne == undefined) {
        datalist.push(data);
      }
    }
    if (datalist.length > 0) {
      let result = await prisma.whitelist.createMany({ data: datalist });
      return result;
    }
    return null;
  }

  async fetchUsersRank(users: string[]) {
    let multiplierResult = await prisma.rankMultiplier.findMany();
    let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } });
    let isStartRank = currentSeason == null ? false : true;
    if (isStartRank) {
      let usersStr = users.join("','");

      let sql = `SELECT "userAddress", "isBan", "rank", "tradeCount", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", eligible, "eligibleCount", "ogPoints", "total"  
      FROM (SELECT row_number() OVER (
          ORDER BY total DESC
      ) AS "rank",
      "tradeCount", 
      CASE WHEN elig.eligible THEN true ELSE false END AS eligible,
      plb."userAddress" AS "userAddress", 
      "convergePoints",
      "convergeVol", 
      "referralSelfRewardPoints",
      "referringRewardPoints", 
      "tradeVol", 
      "tradePoints", 
      "eligibleCount",
      "ogPoints",
      "isBan",
      total
      FROM api."PointsLeaderBoard" AS plb
      LEFT JOIN (SELECT "userAddress", eligible FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal" ,CASE WHEN SUM("tradeVol") >= 5000000000000000000 THEN true ELSE false END AS eligible
      FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE eligible = true) elig
      ON plb."userAddress" = elig."userAddress"
      WHERE season = ${currentSeason.round}
      ORDER BY "total" DESC) nt WHERE nt."userAddress" in (\'${usersStr}\')`;
      let results: any[] = await prisma.$queryRawUnsafe(sql);
      if (results.length > 0) {
        let multiplier = 1;
        let list = JSON.parse(JSON.stringify(results));
        for (let i = 0; i < list.length; i++) {
          const element = list[i];
          let tradeVol = element.tradeVol;
          let isBan = element.isBan;
          let eligible = element.eligible;
          let tradeVolBigNumber = BigNumber.from(tradeVol.toString());
          if (!eligible || tradeVolBigNumber.isZero()) {
            element.rank = 0;
          }
          if (isBan) {
            element.rank = -1;
          }
          for (let a = 0; a < multiplierResult.length; a++) {
            const multiplierItem = multiplierResult[a];
            let startRank = multiplierItem.start_rank;
            let endRank = multiplierItem.end_rank;
            if (startRank <= element.rank && element.rank >= endRank) {
              multiplier = parseFloat(multiplierItem.multiplier.toString());
              element.total = parseFloat((element.total * multiplier).toFixed(1));
              break;
            }
          }
        }
        return list;
      }
    }
    return [];
  }

  // 根据参数地址获取followers
  async followersList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let condition = userAddress.toLowerCase();
    if (condition == "") {
      condition = `t."followerAddress"`;
    }
    let followers: Follower[] = await prisma.$queryRaw`
      SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true
          ELSE false
          END AS "isFollowing", t."userAddress", t.followers, t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
          FROM api."UserFollowing" AS uf
          RIGHT JOIN (
              SELECT 
                "UserFollowing"."userAddress" AS "userAddress", 
                "UserFollowing"."followerAddress" AS "followerAddress", 
                "UserInfo"."followers" AS "followers", 
                "UserInfo"."following" AS "following", 
                "UserInfo"."username" AS "username", 
                "UserInfo"."about" AS "about", 
                "UserInfo"."points" AS "points", 
                "UserInfo"."ranking" AS "ranking",
                "UserInfo"."amm" AS "amm"
              FROM "api"."UserFollowing" 
              JOIN "api"."UserInfo"
              ON "api"."UserFollowing"."userAddress" = "api"."UserInfo"."userAddress" 
              WHERE "api"."UserFollowing"."followerAddress"=${targetAddress.toLowerCase()}
              LIMIT ${pageSize} OFFSET ${pageNo}
            ) t
          ON uf."userAddress" = ${condition}
          AND uf."followerAddress" = t."userAddress";
    `;
    let users = [];
    for (let i = 0; i < followers.length; i++) {
      const element = followers[i];
      users.push(element.userAddress.toLowerCase());
    }
    // ['0x1c6b2888c4268a9c8eaf7eb77a759492bbe10833','0x958d58fbb67666e5f693895edc65f46d051ee304','0x2d528026fef9be28b4c97b10979737b3f445eebd']
    if (users.length > 0) {
      let ranks = await this.fetchUsersRank(users);
      for (let i = 0; i < followers.length; i++) {
        const element = followers[i];
        const userAddress = element.userAddress.toLowerCase();
        for (let r = 0; r < ranks.length; r++) {
          const rank = ranks[r];
          if (userAddress == rank.userAddress) {
            element.points = rank.total;
            element.ranking = parseInt(rank.rank);
          }
        }
      }
    }
    return followers;
  }

  // 根据参数地址获取正在following
  async followingList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let condition = userAddress.toLowerCase();
    if (condition == "") {
      condition = `t."userAddress"`;
    }
    let followList: Follower[] = await prisma.$queryRaw`
    SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true 
          ELSE false 
          END AS "isFollowing", t."followerAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
      FROM api."UserFollowing" AS uf
      RIGHT JOIN (
            SELECT 
              "UserFollowing"."userAddress" AS "userAddress", 
              "UserFollowing"."followerAddress" AS "followerAddress", 
              "UserInfo"."followers" AS "followers", 
              "UserInfo"."following" AS "following", 
              "UserInfo"."username" AS "username", 
              "UserInfo"."about" AS "about", 
              "UserInfo"."points" AS "points", 
              "UserInfo"."ranking" AS "ranking",
              "UserInfo"."amm" AS "amm" 
            FROM "api"."UserFollowing" 
            JOIN "api"."UserInfo"
            ON "api"."UserFollowing"."followerAddress" = "api"."UserInfo"."userAddress" 
            WHERE "api"."UserFollowing"."userAddress"=${targetAddress.toLowerCase()} 
            LIMIT ${pageSize} OFFSET ${pageNo}
        ) t
      ON uf."userAddress" = ${condition}
      AND uf."followerAddress" = t."followerAddress";
    `;
    let users = [];
    for (let i = 0; i < followList.length; i++) {
      const element = followList[i];
      users.push(element.followerAddress.toLowerCase());
    }
    // ['0x1c6b2888c4268a9c8eaf7eb77a759492bbe10833','0x958d58fbb67666e5f693895edc65f46d051ee304','0x2d528026fef9be28b4c97b10979737b3f445eebd']
    if (users.length > 0) {
      let ranks = await this.fetchUsersRank(users);
      for (let i = 0; i < followList.length; i++) {
        const element = followList[i];
        const userAddress = element.followerAddress.toLowerCase();
        for (let r = 0; r < ranks.length; r++) {
          const rank = ranks[r];
          if (userAddress == rank.userAddress) {
            element.points = rank.total;
            element.ranking = parseInt(rank.rank);
          }
        }
      }
    }
    return followList;
  }

  async fetchCodeOwner(code: string) {
    let result = await prisma.userInfo.findFirst({ where: { referralCode: code } })
    if (result != null) {
      return { userAddress: result.userAddress, username: result.username }
    }
    return null
  }

  // userAddress follow followerAddress
  // userAddress following + 1
  // followerAddress follower + 1
  async followUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });
    if (haveFollowed == null) {
      let currentDateTime = new Date().toISOString();
      let currentTimestamp = Math.floor(Date.now() / 1000);
      let follow = {
        status: 1,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp,
        userAddress: userAddress.toLowerCase(),
        followerAddress: followerAddress.toLowerCase()
      };
      try {
        await prisma.userFollowing.create({ data: follow });
      } catch (error) {
        console.log(error);
      } finally {
        await this.fetchFollowAndUpdateUserInfo(userAddress.toLowerCase());
        await this.fetchFollowAndUpdateUserInfo(followerAddress.toLowerCase());
      }
      haveFollowed = await prisma.userFollowing.findUnique({
        where: {
          userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
        }
      });
    }
    return haveFollowed;
  }

  // userAddress follow followerAddress
  // userAddress following - 1
  // followerAddress follower - 1
  async unFollowUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });

    if (haveFollowed != null) {
      try {
        await prisma.userFollowing.delete({
          where: {
            userAddress_followerAddress: {
              userAddress: userAddress.toLowerCase(),
              followerAddress: followerAddress.toLowerCase()
            }
          }
        });
      } catch (error) {
        console.log(error);
      } finally {
        await this.fetchFollowAndUpdateUserInfo(userAddress.toLowerCase());
        await this.fetchFollowAndUpdateUserInfo(followerAddress.toLowerCase());
      }
    }
    return haveFollowed;
  }

  async inputReferralCode(code: string, userAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } });

    if (userInfo == null || userInfo.userAddress == userAddress.toLowerCase()) {
      return null;
    }

    let myUserInfo = await prisma.userInfo.findUnique({ where: { userAddress: userAddress.toLowerCase() } });
    if (myUserInfo.isInputCode) {
      return null;
    }

    let item = await prisma.referralEvents.findFirst({ where: { userAddress: userAddress.toLowerCase() } });
    if (item == null) {
      let result = await prisma.referralEvents.create({ data: { referralCode: code, userAddress: userAddress.toLowerCase() } });
      let countReferralCode = await prisma.referralEvents.count({ where: { referralCode: userInfo.referralCode } });
      await prisma.userInfo.update({
        where: { userAddress: userInfo.userAddress.toLowerCase() },
        data: { countReferralCode: countReferralCode }
      });
      return result;
    } else {
      return item;
    }
  }

  async saveEvent(name: string, params: any, ip: string, userAgent: string) {
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (Array.isArray(params)) {
      let datalist = [];
      for (let i = 0; i < params.length; i++) {
        const element = params[i];
        let data = {
          name: name,
          event: element,
          ip: ip,
          userAgent: userAgent,
          createTime: currentDateTime,
          createTimestamp: currentTimestamp,
          updateTime: currentDateTime,
          updateTimestamp: currentTimestamp
        };
        datalist.push(data);
      }
      await prisma.userEventsLog.createMany({
        data: datalist
      });
    } else {
      await prisma.userEventsLog.create({
        data: {
          name: name,
          event: params,
          ip: ip,
          userAgent: userAgent,
          createTime: currentDateTime,
          createTimestamp: currentTimestamp,
          updateTime: currentDateTime,
          updateTimestamp: currentTimestamp
        }
      });
    }
  }

  async fetchUsernameBy(userAddressList: string[]) {
    let users = await prisma.userInfo.findMany({
      where: {
        userAddress: { in: userAddressList },
      }
    })
    let result = {}
    for (let o = 0; o < userAddressList.length; o++) {
      const element = userAddressList[o];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (element == user.userAddress) {
          if (user.username != undefined && user.username != null && user.username != "") {
            result[element] = user.username
          } else {
            result[element] = element
          }
        }
      }
    }
    return result
  }

  async authUserService(signature: string, publicAddress: string) {
    // let that = this;
    let accessToken = await prisma.userInfo
      .findUnique({
        where: { userAddress: publicAddress }
      })
      ////////////////////////////////////////////////////
      // Step 1: Get the user with the given publicAddress
      ////////////////////////////////////////////////////
      .then(user => {
        if (!user) {
          throw new Error(`User with publicAddress ${publicAddress} is not found`);
        }
        return user;
      })
      ////////////////////////////////////////////////////
      // Step 2: Verify digital signature
      ////////////////////////////////////////////////////
      .then(user => {
        if (!user.nonce) {
          // Should not happen, we should have already sent the response
          throw new Error('User is not defined in "Verify digital signature".');
        }
        const msg = `\x19Ethereum Signed Message:\nHi there! Welcome to Tribe3!\n\nClick to log in to access your very own profile on Tribe3. Please note that this will not execute any blockchain transaction nor it will cost you any gas fee.\n\nYour Nonce: ${user.nonce}`;
        // We now are in possession of msg, publicAddress and signature. We
        // will use a helper from eth-sig-util to extract the address from the signature
        const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
        const address = recoverPersonalSignature({
          data: msgBufferHex,
          sig: signature
        });
        // The signature verification is successful if the address found with
        // sigUtil.recoverPersonalSignature matches the initial publicAddress
        if (address.toLowerCase() === publicAddress.toLowerCase()) {
          return user;
        } else {
          // Should not happen, we should have already sent the response
          throw new Error("Signature verification failed");
        }
      })
      ////////////////////////////////////////////////////
      // Step 3: Generate a new nonce for the user
      ////////////////////////////////////////////////////
      .then(async user => {
        user.nonce = Math.floor(Math.random() * 10000);
        const result = await prisma.userInfo.update({
          where: { userAddress: user.userAddress },
          data: { nonce: user.nonce }
        });
        return result;
      })
      ////////////////////////////////////////////////////
      // Step 4: Create JWT
      ////////////////////////////////////////////////////
      .then(async user => {
        console.log(user);
        const firebaseToken = await global.firebaseAdmin.auth().createCustomToken(user.userAddress);
        return firebaseToken;
      });
    return accessToken;
  }

  async updateByAddress(userAddress: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: {
        userAddress
      },
      data
    });
  }

  async findUsersInfoByAddress(updateUserAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({
      where: {
        userAddress: updateUserAddress.toLowerCase()
      }
    });

    return userInfo;
  }

  async checkUserName(username: string) {
    const updateUserInfo = await prisma.userInfo.findFirst({
      where: { username: username }
    });

    return updateUserInfo;
  }

  async searchAddressUsername(keyword: string, userAddress: string, pageNo: number, pageSize: number, isAddress: boolean) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let searchKeyword = "%" + keyword + "%";
    if (isAddress) {
      let sql = Prisma.sql`SELECT CASE WHEN mf."isFollowing" IS true THEN true ELSE false END AS "isFollowing", uif."userAddress", uif.followers, uif.following, uif.username, uif.about, uif.points, uif.ranking FROM "api"."UserInfo" AS uif
      LEFT JOIN
      (SELECT
            CASE WHEN uf."userAddress" IS NOT NULL 
            THEN true
            ELSE false
            END AS "isFollowing", t."followerAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
            FROM api."UserFollowing" AS uf
            RIGHT JOIN (
                  SELECT 
                    "UserFollowing"."userAddress" AS "userAddress", 
                    "UserFollowing"."followerAddress" AS "followerAddress", 
                    "UserInfo"."followers" AS "followers", 
                    "UserInfo"."following" AS "following", 
                    "UserInfo"."username" AS "username", 
                    "UserInfo"."about" AS "about", 
                    "UserInfo"."points" AS "points", 
                    "UserInfo"."ranking" AS "ranking",
                    "UserInfo"."amm" AS "amm" 
                  FROM "api"."UserFollowing" 
                  JOIN "api"."UserInfo"
                  ON "api"."UserFollowing"."followerAddress" = "api"."UserInfo"."userAddress" 
                  WHERE "api"."UserFollowing"."userAddress"=${userAddress.toLowerCase()}
              ) t
            ON uf."userAddress"=${userAddress.toLowerCase()}
            AND uf."followerAddress" = t."followerAddress") mf 
      ON mf."followerAddress" = uif."userAddress"
      WHERE LOWER(uif.username) LIKE ${searchKeyword.toLowerCase()} OR uif."userAddress" LIKE ${searchKeyword.toLowerCase()}
      LIMIT ${pageSize} OFFSET ${pageNo}`;
      let result = await prisma.$queryRaw(sql);
      return result;
    } else {
      let result = await prisma.$queryRaw`
      SELECT
        "userAddress", 
        followers,
        following, 
        username, 
        about, 
        points, 
        ranking
      FROM "api"."UserInfo"
      WHERE LOWER(username) LIKE ${searchKeyword.toLowerCase()} OR LOWER("userAddress") LIKE ${searchKeyword.toLowerCase()} LIMIT ${pageSize} OFFSET ${pageNo}`;
      return result;
    }
  }

  async subscribeUserEmail(email: string) {
    let haveSubscribed = await prisma.subscribeUsers.findUnique({ where: { email } });
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (haveSubscribed != null) {
      return null;
    } else {
      let data = {
        email: email,
        createTime: currentDateTime,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let result = await prisma.subscribeUsers.create({ data: data });
      return result;
    }
  }

  async isFollowUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });
    return haveFollowed;
  }

  async fetchUserInfo(user: string, targetUser: string) {
    let targetUserInfo: {
      id: string;
      userAddress: string;
      username: string;
      about: string;
      followers: number;
      following: number;
      points: Decimal;
      referralPoints: number;
      referralCode: string;
      isFollowing?: boolean;
      referralUsersCount?: number;
      analysis?: any;
      competition?: any;
    } = await this.findUsersInfoByAddress(targetUser.toLowerCase());
    let analysis = await this.fetchUserSocialProfile(targetUser.toLowerCase());
    if (analysis != null) {
      targetUserInfo.analysis = analysis
    }
    let result = await this.competitionService.getAbsPnlLeaderboard(1);

    if (result != null) {
      let userRecord = null;
      let userRank = 0;
      let userObj = null;
      if (user.length > 0) {
        userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
        if (userRecord) {
          userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
        }
        userObj = {
          userAddress: user.toLowerCase(),
          username: userRecord?.username ?? "",
          rank: userRank.toString(),
          pnl: userRecord?.absolutePnl ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber1(userRecord?.tradedVolume ?? "0").gte(new BigNumber1("5e18"))
        };
      }
      targetUserInfo.competition = userObj;
    }

    if (targetUserInfo == null) {
      return null;
    }

    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: user.toLowerCase(), followerAddress: targetUser.toLowerCase() }
      }
    });
    let isFollowing = false;
    if (haveFollowed != null) {
      isFollowing = true;
    }

    let referralUsersCount = await prisma.referralEvents.count({
      where: { referralCode: targetUserInfo.referralCode }
    });
    targetUserInfo.referralUsersCount = referralUsersCount;
    targetUserInfo.isFollowing = isFollowing;
    return targetUserInfo;
  }

  // async fetchUserInfo(user: string, targetUser: string) {
  //   let targetUserInfo: {
  //     id: string;
  //     userAddress: string;
  //     username: string;
  //     about: string;
  //     followers: number;
  //     following: number;
  //     points: Decimal;
  //     referralPoints: number;
  //     referralCode: string;
  //     isFollowing?: boolean;
  //     referralUsersCount?: number;
  //   } = await this.findUsersInfoByAddress(targetUser.toLowerCase());

  //   if (targetUserInfo == null) {
  //     return null;
  //   }

  //   let haveFollowed = await prisma.userFollowing.findUnique({
  //     where: {
  //       userAddress_followerAddress: { userAddress: user.toLowerCase(), followerAddress: targetUser.toLowerCase() }
  //     }
  //   });
  //   let isFollowing = false;
  //   if (haveFollowed != null) {
  //     isFollowing = true;
  //   }

  //   let referralUsersCount = await prisma.referralEvents.count({
  //     where: { referralCode: targetUserInfo.referralCode }
  //   });
  //   targetUserInfo.referralUsersCount = referralUsersCount;
  //   targetUserInfo.isFollowing = isFollowing;
  //   return targetUserInfo;
  // }

  async updateUserService(userAddress: string, data: any) {
    const result = await prisma.userInfo.update({
      where: { userAddress: userAddress.toLowerCase() },
      data: data
    });
    return result;
  }

  // async test() {
  //   let result: { userAddress: string }[] = await prisma.userInfo.findMany({ where: { referralCode: null } });
  //   for (let i = 0; i < result.length; i++) {
  //     const element: { userAddress: string } = result[i];
  //     await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${element.userAddress.toLowerCase()}::TEXT);`;
  //   }
  // }

  async createUserInfoService(regUserAddress: string) {
    let userAddress = regUserAddress.toLowerCase();
    let existUser = await this.findUsersInfoByAddress(userAddress);
    if (existUser != null) {
      return existUser;
    }
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);

    let createUser: Prisma.UserCreateInput = {
      userAddress: regUserAddress.toLowerCase(),
      createTimestamp: currentTimestamp,
      updateTime: currentDateTime,
      updateTimestamp: currentTimestamp
    };
    let userInfo: Prisma.UserInfoCreateInput = {
      username: "",
      nonce: Math.floor(Math.random() * 1000000),
      about: "",
      updateNameTimes: 0,
      createTime: currentDateTime,
      createTimestamp: currentTimestamp,
      updateTime: currentDateTime,
      updateTimestamp: currentTimestamp,
      user: {
        connectOrCreate: {
          where: {
            userAddress: userAddress
          },
          create: createUser
        }
      }
    };
    const result: UserInfo = await prisma.userInfo.create({ data: userInfo });
    await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${regUserAddress.toLowerCase()}::TEXT);`;
    return result;
  }

  async allUserInfos() {
    let userInfos = await prisma.userInfo.findMany();
    return userInfos;
  }

  async updateDegenScore(userAddress: string) {
    try {
      const result = await axios.get(`https://beacon.degenscore.com/v1/beacon/${userAddress.toLowerCase()}`);
      if (result.status == 200 && result.data) {
        let degenScore = result.data.traits?.degen_score?.value ?? 0;
        const multiplier = await this.pointService.getDegenScoreMultiplier(degenScore);

        let userInfos = await prisma.userInfo.update({
          where: { userAddress: userAddress.toLowerCase() },
          data: { degenScore: degenScore, degenScoreMultiplier: multiplier }
        });
        return userInfos;
      }
    } catch (error) {
      console.log("error", error.message);
      return null;
    }
    return null;
  }
}
