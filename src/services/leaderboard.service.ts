import { PrismaClient } from "@prisma/client";
import { Service } from "typedi";
import { format } from 'date-fns'
import { uuidv4 } from "@firebase/util";
import BigNumber from "bignumber.js";

type Reward = { address: string, username: string, unrealizedpnl: string, fundingpayment: string, realizedpnl: string, updatetimestamp: number, total: string }

@Service()
export class LeaderBoardService {

    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async leaderBoardRankingSave(round: number) {
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT userinfo.username, t.* FROM api."UserInfo" as userinfo 
                                                                 RIGHT JOIN (SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, pnl.realizedpnl AS realizedpnl, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                                 FROM public.rewards 
                                                                 JOIN public.pnl ON pnl.user_address = rewards.user_address 
                                                                 WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty
                                                                 HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 
                                                               ) t
        ON t.address = userinfo."userAddress"
        ORDER BY total DESC`;
        let rewards = []
        let lastUpdateTime = await this.prismaClient.$queryRaw`SELECT update_timestamp FROM public.rewards ORDER BY update_timestamp DESC LIMIT 1`;
        for (let i = 0; i < result.length; i++) {
            const reward: Reward = result[i];
            const item = { "user": reward.address, "username": reward.username, "total": BigNumber(reward.total).toFixed(), "updatetime": lastUpdateTime[0].update_timestamp, "rank": i + 1 }
            rewards.push(item)
        }

        let rankingJsonStr = { result: { rewards: rewards } };//JSON.stringify() ;
        let currentDate = parseInt(format(new Date(), "yyyyMMddhhmm"))
        let uuid = uuidv4().replace("-", "")
        let saveResult = await this.prismaClient.$queryRaw`INSERT INTO public.ranking_history(id, save_dt, data, round) VALUES (${uuid}, ${currentDate}, ${rankingJsonStr}, ${round});`
        console.log(saveResult)
        return "saved"
        //
    }

    async leaderBoardBotsRankingSave(round: number) {
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT userinfo.username, t.* FROM api."UserInfo" as userinfo 
                                                                 RIGHT JOIN (SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, pnl.realizedpnl AS realizedpnl, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                                 FROM public.bots_rewards as rewards
                                                                 JOIN public.pnl ON pnl.user_address = rewards.user_address 
                                                                 WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty
                                                                 HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 
                                                               ) t
        ON t.address = userinfo."userAddress"
        ORDER BY total DESC`;
        let rewards = []
        let lastUpdateTime = await this.prismaClient.$queryRaw`SELECT update_timestamp FROM public.rewards ORDER BY update_timestamp DESC LIMIT 1`;
        for (let i = 0; i < result.length; i++) {
            const reward: Reward = result[i];
            const item = { "user": reward.address, "username": reward.username, "total": BigNumber(reward.total).toFixed(), "updatetime": lastUpdateTime[0].update_timestamp, "rank": i + 1 }
            rewards.push(item)
        }

        let rankingJsonStr = { result: { rewards: rewards } };//JSON.stringify() ;
        let currentDate = parseInt(format(new Date(), "yyyyMMddhhmm"))
        let uuid = uuidv4().replace("-", "")
        let saveResult = await this.prismaClient.$queryRaw`INSERT INTO public.bots_ranking_history(id, save_dt, data, round) VALUES (${uuid}, ${currentDate}, ${rankingJsonStr}, ${round});`
        console.log(saveResult)
        return "saved"
        //
    }



    async leaderBoardList(page: number, size: number, round: number) {
        if (page <= 0) {
            page = 1;
        }
        page = page - 1;
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT userinfo.username, t.* FROM api."UserInfo" as userinfo 
                                                                 RIGHT JOIN (SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, pnl.realizedpnl AS realizedpnl, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                                 FROM public.rewards 
                                                                 JOIN public.pnl ON pnl.user_address = rewards.user_address 
                                                                 WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty
                                                                 HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 
                                                               ) t
        ON t.address = userinfo."userAddress"
        ORDER BY total DESC
        LIMIT ${size} OFFSET ${page * size}`;
        let lastUpdateTime = await this.prismaClient.$queryRaw`SELECT update_timestamp FROM public.rewards ORDER BY update_timestamp DESC LIMIT 1`;
        let rewards = []
        let i = (page * size) + 1
        for (let a = 0; a < result.length; a++) {
            const reward: Reward = result[a];
            const item = { "address": reward.address, "username": reward.username, "total": BigNumber(reward.total).toFixed(), "updatetime": lastUpdateTime[0].update_timestamp, "rank": i }
            rewards.push(item)
            i = i + 1
        }
        return rewards;
    }

    async fetchRangingByUser(userAddress: string, round: number) {
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT userinfo.username, t.* FROM api."UserInfo" as userinfo 
        RIGHT JOIN (SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, pnl.realizedpnl AS realizedpnl, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
        FROM public.rewards 
        JOIN public.pnl ON pnl.user_address = rewards.user_address 
        WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty
        HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 
        ) t
        ON t.address = userinfo."userAddress"
        ORDER BY total DESC`;
        let userRanking = null
        let lastUpdateTime = await this.prismaClient.$queryRaw`SELECT update_timestamp FROM public.rewards ORDER BY update_timestamp DESC LIMIT 1`;
        for (let i = 0; i < result.length; i++) {
            const reward: Reward = result[i];

            if (reward.address == userAddress.toLowerCase()) {
                const item = { "address": reward.address, "username": reward.username, "total": BigNumber(reward.total).toFixed(), "updatetime": lastUpdateTime[0].update_timestamp, "rank": i + 1 }
                userRanking = item;
                break
            }
        }
        if (userRanking == null) {
            userRanking = { "address": userAddress, "username": null, "total": '0', "rank": null }
        }

        return userRanking
    }


    

}
