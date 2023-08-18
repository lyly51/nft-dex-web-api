import {
    JsonController,
    Get,
    QueryParam,
    Post,
    BodyParam,
    Authorized,
    Param,
    Body,
    Res,
    Req,
} from "routing-controllers";
import { LeaderBoardService } from "../services/leaderboard.service";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";

@JsonController()
@Service()
export class LeaderBoardController {
    constructor(private leaderBoardService: LeaderBoardService) { }

    // https://campaign-api.tribe3.xyz/v1/fetch/leaderboard/list/1/30/2
    @Get("/fetch/leaderboard/list/:page/:size/:round")
    async leaderBoardList(@Param("page") page: number, @Param("size") size: number, @Param("round") round: number) {
        let result = await this.leaderBoardService.leaderBoardList(page, size, round)
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/leaderboard/ranking/save/:round")
    async saveLeaderBoardRanking(@Param("round") round: number) {
        let result = await this.leaderBoardService.leaderBoardRankingSave(round);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/leaderboard/bots/ranking/save/:round")
    async saveLeaderBoardBotsRanking(@Param("round") round: number) {
        let result = await this.leaderBoardService.leaderBoardBotsRankingSave(round);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/user/ranking/:userAddress/:round")
    async userRanking(@Param("userAddress") userAddress: string, @Param("round") round: number) {
        let result = await this.leaderBoardService.fetchRangingByUser(userAddress, round)
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }
}