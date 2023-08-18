import { JsonController, Get, QueryParam } from "routing-controllers";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { CompetitionService } from "src/services/competition.service";
import Schema, { Rules } from "async-validator";
import { isAddress } from "ethers/lib/utils";
import BigNumber from "bignumber.js";
import Prize from "src/helpers/competitionS2Prize";
import { UserService } from "src/services";

@JsonController()
@Service()
export class CompetitionController {
  private userAddressValidator: Schema;
  constructor(private competitionService: CompetitionService, private userService: UserService) {
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
      }
    };

    this.userAddressValidator = new Schema(pointsParamsCheck);
  }

  @Get("/competition/leaderboard/absPnl")
  async getAbsPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getAbsPnlLeaderboard(pageNo);

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
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/netConvergenceVol")
  async getNetConvergenceVolLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getNetConvergenceVolLeaderboard(pageNo);
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
          netConvergenceVol: userRecord?.netConvergenceVolume ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/realisedPnl")
  async getRealisedPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getRealisedPnlLeaderboard(pageNo);
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
          pnl: userRecord?.roi ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/topLoser")
  async getTopLoserLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getTopLoserLeaderboard(pageNo);
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
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  // Season 2
  @Get("/competition/leaderboard/s2/absPnl")
  async getS2AbsPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getS2AbsPnlLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topGainerPrize.find(prize => prize.start <= rank && prize.end >= rank);
        const userInfo = await this.userService.getUserInfo(user);
        userObj = {
          userAddress: user.toLowerCase(),
          username: userInfo?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          pnl: userRecord?.pnl ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topGainerPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topFundingPayment")
  async getS2TopFundingPaymentLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getS2FundingPaymentLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topFundingPaymentPrize.find(prize => prize.start <= rank && prize.end >= rank);
        const userInfo = await this.userService.getUserInfo(user);
        userObj = {
          userAddress: user.toLowerCase(),
          username: userInfo?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          fundingPayment: userRecord?.fundingPayment ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topFundingPaymentPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topWeeklyVolume")
  async getS2TopWeeklyVolumeLeaderboard(
    @QueryParam("userAddress") user: string = "",
    @QueryParam("pageNo") pageNo: number = 1,
    @QueryParam("week") week: number = -1
  ) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result =
      week < 0
        ? await this.competitionService.getS2TradedVolumeLeaderboard(pageNo)
        : await this.competitionService.getS2TradedVolumeLeaderboardByWeek(pageNo, week);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.tradedVolumePrize.find(prize => prize.start <= rank && prize.end >= rank);
        const userInfo = await this.userService.getUserInfo(user);
        userObj = {
          userAddress: user.toLowerCase(),
          username: userInfo?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          weeklyTradedVolume: userRecord?.weeklyTradedVolume ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.tradedVolumePrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topReferer")
  async getS2TopRefereeVolumeLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getS2RefereeTradedVolumeLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topReferralPrize.find(prize => prize.start <= rank && prize.end >= rank);
        const userInfo = await this.userService.getUserInfo(user);
        userObj = {
          userAddress: user.toLowerCase(),
          username: userInfo?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          totalVolume: userRecord?.totalVolume ?? "0",
          refereeCount: userRecord?.refereeCount ?? 0,
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topReferralPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/refererTeamList")
  async getS2RefererTeamList(@QueryParam("userAddress") user: string = "") {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    if (!user || user.length == 0) return new ApiResponse(ResponseStatus.Failure);

    let result = await this.competitionService.getS2RefererTeamList(user);
    let rankingResult = await this.competitionService.getS2RefereeTradedVolumeLeaderboard(1);
    let rank = 0;
    let totalPointPrize = 0;
    let totalUsdtPrize = 0;

    let userRecord = null;
    let userObj = null;

    if (rankingResult != null) {
      userRecord = rankingResult.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
      rank = userRecord?.rank ?? 0;
      const prize = Prize.topReferralPrize.find(prize => prize.start <= rank && prize.end >= rank);
      totalPointPrize = prize?.points ?? 0;
      totalUsdtPrize = prize?.usdt ?? 0;
    }

    if (result != null) {
      const userInfo = await this.userService.getUserInfo(user);
      userObj = {
        userAddress: user.toLowerCase(),
        username: userInfo?.username ?? "",
        rank: userRecord?.rank?.toString() ?? "0",
        totalVolume: userRecord?.totalVolume ?? "0",
        teamPointPrize: totalPointPrize,
        teamUsdtPrize: totalUsdtPrize,
        pointPrize: (totalPointPrize ?? 0) * 0.4,
        usdtPrize: (totalUsdtPrize ?? 0) * 0.4
      };

      const totalVolume = new BigNumber(userRecord?.totalVolume ?? "0");
      for (let [index, referee] of result.entries()) {
        let multiplier = 0;
        if (index == 0) multiplier = 0.16;
        if (index == 1) multiplier = 0.14;
        if (index == 2) multiplier = 0.12;
        if (index == 3) multiplier = 0.1;
        if (index == 4) multiplier = 0.08;

        if (referee.tradedVolume == "0") multiplier = 0;

        referee.distribution = new BigNumber(referee.tradedVolume ?? "0").div(totalVolume).multipliedBy(100).toNumber();
        if (isNaN(referee.distribution)) {
          referee.distribution = 0;
        }
        referee.pointPrize = Number((totalPointPrize * multiplier).toFixed(2));
        referee.usdtPrize = Number((totalUsdtPrize * multiplier).toFixed(2));
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, referees: result });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/myRefererTeamList")
  async getS2MyRefererTeamList(@QueryParam("userAddress") user: string = "") {
    if (!user || user.length == 0) return new ApiResponse(ResponseStatus.Failure);
    const myReferer = await this.userService.getRefererUserInfo(user);
    if (!myReferer) return new ApiResponse(ResponseStatus.Success).setData({ user: null, referees: [] });

    return this.getS2RefererTeamList(myReferer.userAddress);
  }
}
