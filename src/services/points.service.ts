import { PrismaClient } from "@prisma/client";
import prisma from "../helpers/client";
import { Service } from "typedi";
import { utils } from "ethers";
import BigNumber from "bignumber.js";

type ReferralTradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string, username: string }
const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);
(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}
@Service()
export class PointsService {
    prismaClient: PrismaClient;

    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let result: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, uif."isBan" AS "isBan", uif."hasTraded" AS "hasTraded", uif."isInputCode" AS "isInputCode", plb."userAddress" AS "userAddress", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", "eligibleCount", "ogPoints", total, "tradeCount"
        FROM api."UserInfo" uif 
        LEFT JOIN api."PointsLeaderBoard" plb 
        ON uif."userAddress" = plb."userAddress"
        WHERE uif."userAddress" = ${user.toLowerCase()} AND plb.season = ${currentSeason.round} AND plb."seasonStart" = ${currentSeason.seasonStart} 
        ORDER BY plb."total" DESC`
        if (result.length > 0) {
            return result.shift()
        }

        return {}
    }

    // 获取当前用户输入了谁的code
    async fetchReferringUser(user: string) {
        let refererResult = await prisma.referralEvents.findFirst({ where: { userAddress: user.toLowerCase() } })
        if (refererResult != null) {
            let code = refererResult.referralCode
            let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
            if (userInfo != null) {
                return { username: userInfo.username, userAddress: userInfo.userAddress };
            }
        }
        return {};
    }

    // 获取当前用户referral points 详细得分
    async fetchCurrentUserReferralRewardDetail(user: string, pageNo: number, pageSize: number) {
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let results: any[] = await this.prismaClient.$queryRaw`SELECT plb."userAddress" AS "userAddress", u2.username AS "username" ,u."userAddress" AS "codeOwner", r."referralCode" AS "referralCode", plb."tradeVol" AS "tradeVol", 
                        CASE WHEN elig.eligible THEN true ELSE false END AS eligiable,
                        CASE WHEN elig.eligible
                        THEN (plb."tradeVol" / 10^18) * 0.03 *10
                        ELSE 0
                        END AS "referringRewardPoints"
                    FROM "ReferralEvents" AS r
                    LEFT JOIN "PointsLeaderBoard" AS plb
                    ON plb."userAddress" = r."userAddress"
                    LEFT JOIN "UserInfo" AS u
                    ON u."referralCode" = r."referralCode"
                    LEFT JOIN "UserInfo" AS u2
                    ON u2."userAddress" = plb."userAddress"
                    LEFT JOIN (SELECT "userAddress", eligible FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal" ,CASE WHEN SUM("tradeVol") >= 5000000000000000000 THEN true ELSE false END AS eligible
                    FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE eligible = true) elig
                    ON r."userAddress" = elig."userAddress"
                    WHERE plb.season = ${currentSeason.round} AND u."userAddress" = ${user} ORDER BY "referralCode" DESC 
                    LIMIT ${pageSize} OFFSET ${pageNo}`;

        return results
    }

    async userReferringPoints(user: string) {
        let result: ReferralTradeVol[] = await this.prismaClient.$queryRaw<ReferralTradeVol[]>`SELECT reu."username" AS username, u."userAddress" AS "codeOwner", r."referralCode" AS code, r."userAddress" AS "reffedUser", u."totalTradingVolume" AS "tradeVol", u."netConvergenceVolume" AS "convergeVol"
            FROM "UserInfo" AS u 
            LEFT JOIN "ReferralEvents" AS r 
            ON u."referralCode" = r."referralCode"
            LEFT JOIN "UserInfo" AS reu
			ON r."userAddress" = reu."userAddress"
            WHERE u."userAddress" = ${user.toLowerCase()} AND u."totalTradingVolume" > 0`;
        return result
    }

    async userReferredPoints(user: string) {
        let result = await prisma.referralEvents.findFirst({ where: { userAddress: user.toLowerCase() } });
        return result;
    }

    async pointsLeaderBoardBySeason(show: string, pageNo: number, pageSize: number, season: number) {
        if (season == 0) {
            return await this.pointsLeaderBoard(show, pageNo, pageSize);
        } else {
            return await this.fetchFinishPointsLeaderBoard(season, pageNo, pageSize, show)
        }
    }

    async fetchFinishPointsLeaderBoard(season: number, pageNo: number, pageSize: number, show: string) {
        let pointsLeaderBoardList = []
        let results: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, plb."isBan" AS "isBan", 
                                        uif."hasTraded" AS "hasTraded", 
                                        uif."isInputCode" AS "isInputCode",
                                        uif."referralCode" AS "referralCode",
                                        plb."tradeCount" AS "tradeCount", 
                                        plb."userAddress" AS "userAddress", 
                                        plb."convergePoints" AS "convergePoints",
                                        plb."convergeVol" AS "convergeVol", 
                                        plb."referralSelfRewardPoints" AS "referralSelfRewardPoints",
                                        plb."referringRewardPoints" AS "referringRewardPoints", 
                                        plb."isBan" AS "isBan", 
                                        plb."tradeVol" AS "tradeVol", 
                                        plb."tradePoints" AS "tradePoints", 
                                        plb."eligibleCount" AS "eligibleCount",
                                        plb."ogPoints" AS "ogPoints", 
                                        plb."finalRank" AS "rank",
                                        plb.multiplier AS multiplier,
                                        (plb.total * plb.multiplier) AS total,
                                        plb.total AS "originalTotal"
                                        FROM api."UserInfo" uif
                                        LEFT JOIN api."PointsLeaderBoard" plb
                                        ON uif."userAddress" = plb."userAddress"
                                        WHERE plb.season = ${season} AND "finalRank" != 0
                                        ORDER BY "finalRank" ASC
                                        LIMIT ${pageSize} OFFSET ${pageNo}`
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            // console.log(item)
            let userAddress = item.userAddress;
            let tradeVolPoints = item.tradePoints;
            let referralPoints = BigNumber(item.referringRewardPoints.toString()).plus(item.referralSelfRewardPoints.toString()).toString();
            let convergePoints = item.convergePoints;
            let total = item.total
            let multiplier = item.multiplier
            let originalTotal = item.originalTotal
            let ogPoints = item.ogPoints
            let referralCode = item.referralCode
            let rank = item.rank
            // console.log(`${tradeVolPoints} + ${referralPoints} + ${convergePoints} = ${total}`)
            let data = {
                total: parseFloat(total),
                originalTotal: parseFloat(parseFloat(originalTotal).toFixed(2)),
                multiplier: parseFloat(multiplier),
                username: item.username,
                userAddress: userAddress,
                isBan: item.isBan,
                tradeVol: item.tradeVol,
                referralCode: referralCode,
                rank: parseInt(rank)
            }
            if (show != null) {
                let showData = show.split(",")
                if (showData.indexOf("tradeVol") != -1) {
                    data['tradeVolPoints'] = parseFloat(tradeVolPoints)
                }

                if (showData.indexOf('referral') != -1) {
                    data['referralPoints'] = parseFloat(referralPoints)
                }

                if (showData.indexOf('converge') != -1) {
                    data['convergePoints'] = parseFloat(convergePoints)
                }
                if (showData.indexOf('og') != -1) {
                    data['og'] = parseFloat(ogPoints)
                }
            }
            pointsLeaderBoardList.push(data)
        }
        return pointsLeaderBoardList;
    }

    async pointsLeaderBoard(show: string, pageNo: number, pageSize: number) {
        let isStartRank = await this.checkIsSeason()
        let multiplierResult = await prisma.rankMultiplier.findMany();
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let rankNo = 0
        let pointsLeaderBoardList = []
        let results: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, plb."isBan" AS "isBan", 
            CASE WHEN elig.eligible THEN true ELSE false END AS eligible,
            uif."hasTraded" AS "hasTraded", 
            uif."isInputCode" AS "isInputCode",
            uif."referralCode" AS "referralCode",
            plb."tradeCount" AS "tradeCount", 
            plb."userAddress" AS "userAddress", 
            plb."convergePoints" AS "convergePoints",
            plb."convergeVol" AS "convergeVol", 
            plb."referralSelfRewardPoints" AS "referralSelfRewardPoints",
            plb."referringRewardPoints" AS "referringRewardPoints",  
            plb."tradeVol" AS "tradeVol", 
            elig."tradeVolTotal" AS "tradeVolTotal",
            plb."tradePoints" AS "tradePoints", 
            plb."eligibleCount" AS "eligibleCount",
            plb."ogPoints" AS "ogPoints", 
            plb.total AS total
            FROM api."UserInfo" uif
            LEFT JOIN api."PointsLeaderBoard" plb
            ON uif."userAddress" = plb."userAddress"
            LEFT JOIN (SELECT "userAddress", eligible, "tradeVolTotal" FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal" ,CASE WHEN SUM("tradeVol") >= 5000000000000000000 THEN true ELSE false END AS eligible
                     FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE eligible = true) elig
            ON plb."userAddress" = elig."userAddress"
            WHERE plb.season = ${currentSeason.round} AND elig.eligible = true AND plb."tradeVol" > 0
            ORDER BY plb."total" DESC
            LIMIT ${pageSize} OFFSET ${pageNo}`

        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            // console.log(item)
            let userAddress = item.userAddress;
            let tradeVolPoints = item.tradePoints;
            let referralPoints = BigNumber(item.referringRewardPoints.toString()).plus(item.referralSelfRewardPoints.toString()).toString();
            let convergePoints = item.convergePoints;
            let total = item.total
            let ogPoints = item.ogPoints
            let referralCode = item.referralCode
            let eligible = item.eligible
            let tradeVolTotal = item.tradeVolTotal == null ? "0" : item.tradeVolTotal
            // console.log(`${tradeVolPoints} + ${referralPoints} + ${convergePoints} = ${total}`)
            let data = { total: parseFloat(total), originalTotal: parseFloat(parseFloat(total).toFixed(2)), multiplier: 1, username: item.username, userAddress: userAddress, isBan: item.isBan, tradeVol: item.tradeVol, referralCode: referralCode, eligible: eligible, tradeVolTotal: tradeVolTotal }
            if (show != null) {
                let showData = show.split(",")
                if (showData.indexOf("tradeVol") != -1) {
                    data['tradeVolPoints'] = parseFloat(tradeVolPoints)
                }

                if (showData.indexOf('referral') != -1) {
                    data['referralPoints'] = parseFloat(referralPoints)
                }

                if (showData.indexOf('converge') != -1) {
                    data['convergePoints'] = parseFloat(convergePoints)
                }
                if (showData.indexOf('og') != -1) {
                    data['og'] = parseFloat(ogPoints)
                }
            }
            pointsLeaderBoardList.push(data)
        }

        // pointsLeaderBoardList.sort(function (a, b) { return b.total - a.total })
        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const element = pointsLeaderBoardList[i];
            if (isStartRank) {
                let isNext = element.isBan ? 0 : 1
                let rank = rankNo
                if (element.eligible) {
                    rank = rank + isNext
                    element.rank = element.isBan ? -1 : rank + pageNo
                } else {
                    element.rank = 0
                }
                for (let a = 0; a < multiplierResult.length; a++) {
                    const multiplierItem = multiplierResult[a];
                    let startRank = multiplierItem.start_rank;
                    let endRank = multiplierItem.end_rank;
                    if (startRank <= element.rank && element.rank <= endRank) {
                        let multiplier = parseFloat(multiplierItem.multiplier.toString())
                        element.multiplier = multiplier
                        element.total = parseFloat((element.total * multiplier).toFixed(1))
                        break
                    }
                }
                rankNo = rank
            } else {
                element.multiplier = 1
                element.rank = 0
            }
        }

        let finalRanks = []
        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const point = pointsLeaderBoardList[i];
            if (point.rank != 0) {
                finalRanks.push(point)
            }
        }

        return finalRanks
    }

    async checkIsSeason() {
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        if (currentSeason.round == 0) {
            return false
        } else {
            return true
        }
    }

    async getReferredUserCount(user: string): Promise<number> {
        const userInfo = await prisma.userInfo.findFirst({ where: { userAddress: user } })
        if (!userInfo) { return 0 }
        const userReferralCode = userInfo.referralCode
        const referredUserCount = await prisma.referralEvents.count({ where: { referralCode: userReferralCode } })
        return referredUserCount
    }

    async userPointsBySeason(user: string, show: string, season: number) {
        if (season == 0) {
            return await this.userPoints(user, show)
        } else {
            return await this.userPointsHistorySeason(user, show, season)
        }
    }

    async userPointsHistorySeason(user: string, show: string, season: number) {
        let results = await prisma.pointsLeaderBoard.findMany({ where: { AND: [{ season: season }, { userAddress: user.toLowerCase() }] } })
        let rankData = {
            rank: 0,
            multiplier: 0,
            total: 0,
            originalTotal: 0,
            userAddress: user,
            username: "",
            tradeVol: { vol: "", points: 0, multiplier: 1 },
            referral: {
                referralSelfRewardPoints: 0,
                referringRewardPoints: 0
            }, converge: {
                points: 0,
                val: ""
            },
            referralUser: {},
            eligibleCount: 0,
            referredUserCount: 0,
            referralCode: "",
            isInputCode: false,
            isTrade: false,
            isBan: false,
            eligible: false,
            degenScore: 0
        }
        if (results.length == 0) {
            return rankData
        } else {
            let item = results.shift()
            let userInfo = await prisma.userInfo.findFirst({ where: { userAddress: user.toLowerCase() } })
            let enterReferralUser = await this.fetchReferringUser(user.toLowerCase())
            rankData.rank = parseInt(item.finalRank.toString())
            rankData.multiplier = parseFloat(item.multiplier.toString())
            rankData.total = parseFloat(item.total.toString()) * parseFloat(item.multiplier.toString())
            rankData.originalTotal = parseFloat(item.total.toString())
            rankData.userAddress = user.toLowerCase()
            rankData.username = userInfo.username
            rankData.tradeVol = { vol: item.tradeVol.toString(), points: parseFloat(item.tradePoints.toString()), multiplier: parseFloat(userInfo.degenScoreMultiplier.toString()) }
            rankData.referral = { referralSelfRewardPoints: parseFloat(item.referralSelfRewardPoints.toString()), referringRewardPoints: parseFloat(item.referringRewardPoints.toString()) }
            rankData.converge = { points: parseFloat(item.convergePoints.toString()), val: item.convergeVol.toString() }
            rankData.referralUser = enterReferralUser
            rankData.eligibleCount = parseInt(item.eligibleCount.toString())
            rankData.referralCode = userInfo.referralCode
            rankData.isBan = item.isBan
            let tradeBigNumberVol = BigNumber(item.tradeVol.toString())
            let limit = BigNumber(utils.parseEther("5").toString())
            if (tradeBigNumberVol.gte(limit)) {
                rankData.eligible = true
            } else {
                rankData.eligible = false
            }
            rankData.isInputCode = userInfo.isInputCode
            rankData.isTrade = userInfo.hasTraded
            rankData.degenScore = parseFloat(userInfo.degenScore.toString())
        }
        return rankData
    }

    async userPoints(user: string, show: string) {
        let multiplierResult = await prisma.rankMultiplier.findMany();
        let enterReferralUser = await this.fetchReferringUser(user);
        let referredUserCount = await this.getReferredUserCount(user);
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let isStartRank = await this.checkIsSeason()
        // let filterIsBan = (isBan: boolean) => { return isBan ? ' AND uif."isBan"=false' : ' AND 1=1' }
        let filterIsOver5ETH = (isOver: boolean) => { return isOver ? ` elig.eligible = true AND plb."tradeVol" > 0` : ' 1=1' }
        var sql = (isOver: boolean) => {
            return `SELECT "username", "isBan", "rank", "hasTraded", "referralCode", "isInputCode", "tradeCount", "userAddress", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", eligible, "eligibleCount", "ogPoints", "total", "degenScore", "degenScoreMultiplier", "tradeVolTotal"  
                    FROM (SELECT uif.username AS username, uif."isBan" AS "isBan",  row_number() OVER (
                        ORDER BY total DESC
                    ) AS "rank",
                    uif."hasTraded" AS "hasTraded",
                    uif."referralCode" AS "referralCode", 
                    uif."isInputCode" AS "isInputCode",
                    plb."tradeCount" AS "tradeCount", 
                    plb."userAddress" AS "userAddress", 
                    plb."convergePoints" AS "convergePoints",
                    plb."convergeVol" AS "convergeVol", 
                    plb."referralSelfRewardPoints" AS "referralSelfRewardPoints",
                    plb."referringRewardPoints" AS "referringRewardPoints", 
                    plb."tradeVol" AS "tradeVol", 
                    plb."tradePoints" AS "tradePoints", 
                    plb."eligibleCount" AS "eligibleCount",
                    plb."ogPoints" AS "ogPoints", 
                    CASE WHEN elig.eligible THEN true ELSE false END AS eligible,
                    elig."tradeVolTotal" AS "tradeVolTotal",
                    plb.total AS total,
                    uif."degenScore" AS "degenScore",
					uif."degenScoreMultiplier" AS "degenScoreMultiplier"
                    FROM api."UserInfo" uif 
                    LEFT JOIN api."PointsLeaderBoard" plb 
                    ON uif."userAddress" = plb."userAddress"
                    LEFT JOIN (SELECT "userAddress", eligible, "tradeVolTotal" FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal" ,CASE WHEN SUM("tradeVol") >= 5000000000000000000 THEN true ELSE false END AS eligible
                    FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE eligible = true) elig
                    ON plb."userAddress" = elig."userAddress"
                    WHERE plb.season = ${currentSeason.round} AND ${filterIsOver5ETH(isOver)}
                    ORDER BY plb."total" DESC) nt WHERE nt."userAddress" = '${user.toLowerCase()}'`
        }
        let results: any[] = await this.prismaClient.$queryRawUnsafe(sql(true))

        let rankData = null
        if (results.length > 0) {
            rankData = results.shift()
        } else {
            results = await this.prismaClient.$queryRawUnsafe(sql(false))
            // console.log(results)
            if (results.length > 0) {
                rankData = results.shift()
            }
        }

        if (rankData == null) {
            return {
                rank: 0,
                multiplier: 0,
                total: 0,
                originalTotal: 0,
                userAddress: user,
                username: "",
                tradeVol: { vol: 0, points: 0, multiplier: 1 },
                referral: {
                    referralSelfRewardPoints: 0,
                    referringRewardPoints: 0
                }, converge: {
                    points: 0,
                    val: 0
                },
                referralUser: {},
                eligibleCount: 0,
                referredUserCount: 0,
                referralCode: "",
                isInputCode: false,
                isTrade: false,
                isBan: false,
                eligible: false,
                tradeVolTotal: 0,
                degenScore: 0
            }
        }
        let rank = rankData.rank
        let multiplier = 1
        if (rankData.isBan) {
            rank = "-1"
        } else {
            if (!rankData.eligible || rankData.tradeVol == "0") {
                rank = 0
            }
        }

        let total = parseFloat(rankData.total)
        let originalTotal = parseFloat(rankData.total)
        for (let a = 0; a < multiplierResult.length; a++) {
            const multiplierItem = multiplierResult[a];
            let startRank = multiplierItem.start_rank;
            let endRank = multiplierItem.end_rank;
            if (startRank <= rank && rank <= endRank) {
                multiplier = parseFloat(multiplierItem.multiplier.toString())
                total = parseFloat((total * multiplier).toFixed(1))
                break
            }
        }
        // 5000000000000000000
        // 1000000000000000000
        if (!isStartRank) {
            rank = 0
            multiplier = 1
        }
        let userTradeVolTotal: any[] = await this.prismaClient.$queryRaw` SELECT "userAddress", "tradeVolTotal" FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal"
        FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE t."userAddress" = ${rankData.userAddress}`
        let tradeVolTotal = '0'
        if (userTradeVolTotal.length > 0) {
            tradeVolTotal = userTradeVolTotal[0].tradeVolTotal == null ? "0" : userTradeVolTotal[0].tradeVolTotal
        }

        // let multiplierResult = await prisma.rankMultiplier.findFirst({ where: { start_rank: { lte: rank }, end_rank: { gte: rank } } })
        let result = {
            rank: parseInt(rank),
            multiplier: multiplier,
            total: total,
            originalTotal: originalTotal,
            userAddress: rankData.userAddress,
            username: rankData.username,
            referralUser: enterReferralUser,
            eligibleCount: parseFloat(rankData.eligibleCount),
            referralCode: rankData.referralCode,
            isBan: rankData.isBan,
            isInputCode: rankData.isInputCode,
            isTrade: rankData.isTrade,
            degenScore: rankData.degenScore,
            eligible: rankData.eligible,
            tradeVolTotal: tradeVolTotal,
            referredUserCount
        }

        let showData = show.split(",")
        if (showData.indexOf("tradeVol") != -1) {
            result['tradeVol'] = { vol: rankData.tradeVol, points: parseFloat(rankData.tradePoints), multiplier: rankData.degenScoreMultiplier }
        }
        if (showData.indexOf('referral') != -1) {
            result['referral'] = {
                referralSelfRewardPoints: parseFloat(rankData.referralSelfRewardPoints),
                referringRewardPoints: parseFloat(rankData.referringRewardPoints)
            }
        }
        if (showData.indexOf('og') != -1) {
            result['og'] = parseFloat(rankData.ogPoints)
        }
        if (showData.indexOf('converge') != -1) {
            result['converge'] = {
                points: parseFloat(rankData.convergePoints),
                val: rankData.convergeVol
            }
        }

        return result
    }

    async getDegenScoreMultiplier(score: number): Promise<number> {
        let multiplierResult = await prisma.degenscoreMultiplier.findFirst({
            where: { start_points: { lt: score }, end_points: { gte: score } }
        });

        if (multiplierResult == null) {
            return 1;
        } else {
            return multiplierResult.multiplier.toNumber()
        }
    }
}