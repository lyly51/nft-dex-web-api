import { JsonController, Get, QueryParam, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import Schema, { Rules } from "async-validator";
import { isAddress } from "ethers/lib/utils";

@JsonController()
@Service()
export class PointsController {
    private userAddressValidator: Schema;
    constructor(private pointService: PointsService) {
        const pointsParamsCheck: Rules = {
            user: {
                type: "string",
                required: false,
                message: "Invalid user address",
                validator: (rule: any, value: any) => {
                    if (value == "" || value == undefined) {
                        return true;
                    } else {
                        return isAddress(value);
                    }
                }
            },
            show: {
                type: "string",
                required: true,
                message: "need to show params",
                validator: (rule: any, value: any) => {
                    if (value == "" || value == undefined) {
                        return true;
                    } else {
                        let showData = value.split(",")
                        if (showData.indexOf("tradeVol") != -1 || showData.indexOf('referral') != -1 || showData.indexOf('og') != -1 || showData.indexOf('converge') != -1) {
                            return true
                        } else {
                            return false
                        }
                    }
                }
            }
        };

        this.userAddressValidator = new Schema(pointsParamsCheck);
    }

    @Get("/fetch/:user/trade/vol")
    async fetchTradeVol(@Param("user") user: string) {
        let result = await this.pointService.userTradeVol(user);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/points/rank")
    async fetchPointsLeaderBoard(@QueryParam("show") show: string, 
        @QueryParam("season") season: number = 0,
        @QueryParam("pageNo") pageNo: number = 1,
        @QueryParam("pageSize") pageSize: number = 250) {
        try {
            await this.userAddressValidator.validate({ show: show }, errors => {
                if (errors) {
                    for (let i = 0; i < errors.length; i++) {
                        const error = errors[i];
                        throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
                    }
                }
            });
        } catch (error) {
            return error;
        }
        if (pageSize > 250) {
            pageSize = 250
        }
        if (pageNo > 0) {
            pageNo = pageNo - 1;
            pageNo = pageNo * pageSize;
        }
        let result = await this.pointService.pointsLeaderBoardBySeason(show, pageNo, pageSize, season);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/points/:user")
    async fetchPoints(@Param("user") user: string, @QueryParam("season") season: number = 0, @QueryParam("show") show: string) {
        try {
            await this.userAddressValidator.validate({ user: user, show: show }, errors => {
                if (errors) {
                    for (let i = 0; i < errors.length; i++) {
                        const error = errors[i];
                        throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
                    }
                }
            });
        } catch (error) {
            return error;
        }
        let result = await this.pointService.userPointsBySeason(user.toLowerCase(), show, season);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/points/referral/reward/detail/:user")
    async fetchUserReferralRewardDetail(@Param("user") user: string, @QueryParam("pageNo") pageNo: number = 1,
        @QueryParam("pageSize") pageSize: number = 250) {
        try {
            await this.userAddressValidator.validate({ user: user }, errors => {
                if (errors) {
                    for (let i = 0; i < errors.length; i++) {
                        const error = errors[i];
                        throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
                    }
                }
            });
        } catch (error) {
            return error;
        }
        if (pageSize > 250) {
            pageSize = 250
        }
        if (pageNo > 0) {
            pageNo = pageNo - 1;
            pageNo = pageNo * pageSize;
        }
        let result = await this.pointService.fetchCurrentUserReferralRewardDetail(user.toLowerCase(), pageNo, pageSize);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    // @Get("/fetchDegenscore")
    //   async fetchDegenscore() {
    //     const allUsers = await this.userService.allUserInfos();
    //     let result;
    //     for (let user of allUsers) {
    //       try {
    //         result = await axios.get(`https://beacon.degenscore.com/v1/beacon/${user.userAddress}`);
    //         console.log("result.response", result.status);
    //         if (result.status == 200 && result.data) {
    //           let degenScore = result.data.traits?.degen_score?.value ?? 0;
    //           console.log("degenScore", degenScore);
    //           const multiplier = await this.pointService.getDegenScoreMultiplier(degenScore);
    //           await this.userService.updateDegenScore(user.userAddress, degenScore, multiplier);
    //         }
    //       } catch (error) {
    //         console.log("error", error.message);
    //       }
    //       await new Promise(resolve => setTimeout(resolve, 500));
    //     }
    //     return new ApiResponse(ResponseStatus.Success).setData("ok");
    //     //return new ApiResponse(ResponseStatus.Failure);
    //   }
}