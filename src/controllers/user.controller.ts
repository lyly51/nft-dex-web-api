import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req, Param } from "routing-controllers";
import { AchievementService, ClearingHouseService, UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { isAddress } from "ethers/lib/utils";
import Schema, { Rules } from "async-validator";
import { ethers } from "ethers";
import infuraClient from "src/helpers/infuraClient";
// import { Logging } from '@google-cloud/logging';

type CreateUserInfoBody = {
  userAddress: string;
  username: string;
  nonce: number;
};
const CLEARING_HOUSE_ABI = require("src/abi/clearingHouse_abi.json");

@JsonController()
@Service()
export class UserController {
  private twoAddressValidator: Schema;

  constructor(
    private userService: UserService,
    private achievementService: AchievementService,
    private clearingHouseService: ClearingHouseService
  ) {
    const followListAPICheck: Rules = {
      user: {
        type: "string",
        required: true,
        message: "Invalid user address",
        validator: (rule: any, value: any) => {
          if (value == "") {
            return true;
          } else {
            return isAddress(value);
          }
        }
      },
      viewer: {
        type: "string",
        required: true,
        message: "need to right viewer address",
        validator: (rule: any, value: any) => isAddress(value)
      }
    };

    this.twoAddressValidator = new Schema(followListAPICheck);
  }

  @Post("/users/connect/wallet")
  async connectWallet(@BodyParam("address") address: string) {
    if (!address) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("Missing parameters").toObject();
    }

    const user = await this.userService.saveConnectWalletAddress(address.toLowerCase());
    if (!user) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("User not found").toObject();
    } else {
      return new ApiResponse(ResponseStatus.Success).setData(user).toObject();
    }
  }

  @Get("/users/find/connected/:address")
  async fetchConnectedAddress(@Param("address") address: string) {
    const user = await this.userService.fetchConnectWallet(address.toLowerCase());
    if (!user) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("User not found").toObject();
    } else {
      return new ApiResponse(ResponseStatus.Success).setData(user).toObject();
    }
  }

  @Get("/users/find")
  async getUserByAddress(@QueryParam("address") address: string) {
    if (!address) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("Missing parameters").toObject();
    }
    const user = await this.userService.findByAddress(address);

    if (!user) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("User not found").toObject();
    } else {
      return new ApiResponse(ResponseStatus.Success).setData(user).toObject();
    }
  }

  checkUserName(username: string) {
    let checkMessage = "";
    let checkUserNameResult = false;
    if (username == "" || username == null) {
      checkUserNameResult = true;
    } else {
      var patten = /^[a-zA-Z0-9_]{3,30}$/;
      let result = patten.test(username);
      if (!result) {
        checkUserNameResult = false;
        checkMessage = "username must be 5-10 characters";
      } else {
        checkUserNameResult = true;
      }
    }
    let check = { result: checkUserNameResult, message: checkMessage };
    if (!check.result) {
      throw new ApiResponse(ResponseStatus.UsernameWrong).setErrorMessage(check.message);
    }
  }

  checkAbout(about: string) {
    let checkAboutResult = false;
    let checkMessage = "";
    if (about == "" || about == null) {
      checkAboutResult = true;
    } else {
      if (about.length >= 0 && about.length <= 200) {
        checkAboutResult = true;
      } else {
        checkMessage = "about can not over 200 characters";
        checkAboutResult = false;
      }
    }
    let check = { result: checkAboutResult, message: checkMessage };
    if (!check.result) {
      throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(check.message);
    }
  }

  @Authorized(["auth-token"])
  @Post("/users/update")
  async updateUser(
    @BodyParam("username") username: string,
    @BodyParam("userAddress") userAddress: string,
    @BodyParam("about") about: string
  ) {
    let isUpdateUsername = false;
    if (username != "" && username != null) {
      var existUser = await this.userService.findUsersInfoByAddress(userAddress);
      if (existUser != null && existUser.username != username) {
        let checkUsernameExist = await this.userService.checkUserName(username);
        if (checkUsernameExist != null) {
          return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`${username} already have user used`).toObject();
        } else {
          isUpdateUsername = true;
        }
      }
    }

    if (username == null) {
      username = "";
    }
    if (about == null) {
      about = "";
    }

    try {
      this.checkUserName(username);
      this.checkAbout(about);
    } catch (error) {
      throw error;
    }

    let currentDateTime = new Date();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    let user: any = { username: username, about: about };
    if (isUpdateUsername) {
      var currentDate = new Date();
      let currentYear = currentDate.getFullYear();
      let lastTimeUpdateYear = existUser.updateTime;
      let updateTimes = existUser.updateNameTimes + 1;
      if (lastTimeUpdateYear.getFullYear() < currentYear) {
        updateTimes = 1;
      }
      // 说移除一年改3次的限制, DB相关数据保留
      // else {
      //   if (updateTimes > 3) {
      //     return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`can not change username over 3 times pre year`).toObject();;
      //   }
      // }
      user = {
        username: username,
        about: about,
        updateNameTimes: updateTimes,
        updateTimestamp: currentTimestamp,
        updateTime: currentDateTime
      };
    }
    let result = await this.userService.updateUserService(userAddress, user);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData({
        id: result.id,
        userAddress: result.userAddress,
        nonce: result.nonce,
        username: result.username,
        about: result.about
      });
    }
    return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`unKnow reason`).toObject();
  }

  async findUserByName(username: string) {
    let result = await this.userService.checkUserName(username);
    return result;
  }

  @Get("/users/referral/code/userinfo")
  async fetchUserByReferralCode(@QueryParam("code") code: string) {
    if (code != null && code != undefined && code.length == 7) {
      let result = await this.userService.fetchCodeOwner(code);
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Success).setData(null);
  }


  @Post("/users/search")
  async search(
    @BodyParam("keyword") keyword: string,
    @BodyParam("userAddress") userAddress: string,
    @BodyParam("pageNo") pageNo: number = 1,
    @BodyParam("pageSize") pageSize: number = 30
  ) {
    let isAddress = ethers.utils.isAddress(userAddress);
    let result = await this.userService.searchAddressUsername(keyword, userAddress, pageNo, pageSize, isAddress);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/users/info")
  async fetchUserInfo(
    @BodyParam("user", { required: true }) user: string,
    @BodyParam("targetUser", { required: true }) targetUser: string
  ) {
    try {
      await this.twoAddressValidator.validate({ user: user, viewer: targetUser }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }

    let result = await this.userService.fetchUserInfo(user, targetUser);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/users/info/v1")
  async fetchUserInfov1(
    @BodyParam("user", { required: true }) user: string,
    @BodyParam("targetUser", { required: true }) targetUser: string
  ) {
    try {
      await this.twoAddressValidator.validate({ user: user, viewer: targetUser }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }

    let result = await this.userService.fetchUserInfo(user, targetUser);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/users")
  async findUser(@QueryParam("publicAddress", { required: true }) userAddress: string) {
    if (isAddress(userAddress)) {
      let result = await this.userService.findUsersInfoByAddress(userAddress.toLowerCase());
      if (result != null) {
        return new ApiResponse(ResponseStatus.Success).setData(result);
      }
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  // @Authorized("auth-token")
  // @Post("/test")
  // async test(@BodyParam("userAddress", { required: true }) userAddress: string) {
  //   await this.userService.test();
  //   return new ApiResponse(ResponseStatus.Success);
  // }

  @Post("/users")
  async createUser(@BodyParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.userService.createUserInfoService(userAddress);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/following/list")
  async following(
    @BodyParam("user", { required: true }) user: string,
    @BodyParam("targetUser", { required: true }) targetUser: string,
    @BodyParam("pageNo") pageNo: number = 1,
    @BodyParam("pageSize") pageSize: number = 30
  ) {
    try {
      await this.twoAddressValidator.validate({ user: user, viewer: targetUser }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }

    let result = await this.userService.followingList(user, targetUser, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  // @Post("/users/create/whitelist")
  // async createWhitelist(@BodyParam("users", { required: true }) users: []) {

  //   let result = await this.userService.saveWhitelist(users)
  //   if (result != null) {
  //     return new ApiResponse(ResponseStatus.Success);
  //   }
  //   return new ApiResponse(ResponseStatus.Failure);
  // }

  @Post("/users/subscribe/email")
  async subscribeEmail(@BodyParam("email", { required: true }) email: string) {
    const descriptor: Rules = {
      email: [
        { type: "email", required: true, message: "invalid email" },
        {
          validator() {
            return [];
          }
        }
      ]
    };
    let emailValidator = new Schema(descriptor);
    try {
      await emailValidator.validate({ email: email }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }

    let result = await this.userService.subscribeUserEmail(email);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success);
    }
    return new ApiResponse(ResponseStatus.Failure).setErrorMessage("duplicate email");
  }

  @Get("/users/whitelist/:address")
  async findAddressInWhitelist(@Param("address") address: string) {
    let result = await this.userService.fetchWhitelist(address.toLowerCase());
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/followers/list")
  async followers(
    @BodyParam("user", { required: true }) user: string,
    @BodyParam("targetUser", { required: true }) targetUser: string,
    @BodyParam("pageNo") pageNo: number = 1,
    @BodyParam("pageSize") pageSize: number = 30
  ) {
    try {
      await this.twoAddressValidator.validate({ user: user, viewer: targetUser }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }
    let result = await this.userService.followersList(user, targetUser, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  @Authorized("auth-token")
  @Post("/users/follow")
  async follow(
    @BodyParam("userAddress", { required: true }) user: string,
    @BodyParam("followerAddress", { required: true }) follower: string
  ) {
    console.log("follow");
    let result = await this.userService.followUser(user, follower);
    if (result) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Authorized("auth-token")
  @Post("/users/unfollow")
  async unFollower(
    @BodyParam("userAddress", { required: true }) user: string,
    @BodyParam("followerAddress", { required: true }) follower: string
  ) {
    let result = await this.userService.unFollowUser(user, follower);
    if (result) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure).setErrorMessage("no this follower");
  }

  @Post("/users/auth")
  async authUser(@BodyParam("signature") signature: string, @BodyParam("publicAddress") publicAddress: string) {
    let result = await this.userService.authUserService(signature, publicAddress);
    if (result != null) {
      await this.userService.updateDegenScore(publicAddress)
      return new ApiResponse(ResponseStatus.Success).setData({ token: result }).toObject();
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/users/event")
  async eventLog(
    @BodyParam("name", { required: true }) name: string,
    @BodyParam("params", { required: true }) event: any,
    @Req() request: any
  ) {
    let userAgent = request.headers["user-agent"];
    let ip = request.ip.replace("::ffff:", "");
    await this.userService.saveEvent(name, event, ip, userAgent);
    return new ApiResponse(ResponseStatus.Success).toObject();
  }

  @Authorized("auth-token")
  @Post("/users/referral/code")
  async inputReferralCode(
    @BodyParam("code", { required: true }) code: string,
    @BodyParam("userAddress", { required: true }) userAddress: string
  ) {
    let result = await this.userService.inputReferralCode(code, userAddress);
    if (result == null) {
      return new ApiResponse(ResponseStatus.Failure).toObject();
    }
    let referralUserInfo = await this.userService.userInfoByReferralCode(code);
    try {
      await this.achievementService.completeAchievement(userAddress, "A02");
      let existingAchievementRecord = await this.achievementService.findUserAchievementByCodeAndReferredUser("A01", userAddress);
      if (existingAchievementRecord == null) {
        await this.achievementService.completeAchievement(referralUserInfo.userAddress, "A01", userAddress);
      }
    } catch (e) {
      // console.log(e); Silent error for now
    }

    return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
  }

  @Authorized("auth-token")
  @Post("/users/trade/completed")
  async completeTrade(
    @BodyParam("txHash", { required: true }) txHash: string,
    @BodyParam("userAddress", { required: true }) userAddress: string
  ) {
    let chContractInterface = new ethers.utils.Interface(CLEARING_HOUSE_ABI);
    let tx = await infuraClient.getTransaction(txHash);
    let decodedData = chContractInterface.parseTransaction(tx);

    if (
      (decodedData.name === "openPosition" || decodedData.name === "closePosition") &&
      tx.from.toLowerCase() === userAddress.toLowerCase()
      // && tx.to.toLowerCase() === "0x481AD75e7874c967e3E26eED23b61eE538b51042".toLowerCase() // Move to .env
    ) {
      await this.userService.updateUserInfos({
        data: {
          isInputCode: true,
          hasTraded: true
        },
        where: {
          userAddress: userAddress.toLowerCase()
        }
      });

      let amm: string = decodedData.args[0].toString();
      let side: string = decodedData.args[1].toString();
      try {
        // A03 - Referer Traded
        let refererUserInfo = await this.userService.getRefererUserInfo(userAddress);
        if (refererUserInfo != null) {
          let existingAchievementRecord = await this.achievementService.findUserAchievementByCodeAndReferredUser("A03", userAddress);
          if (existingAchievementRecord == null) {
            await this.achievementService.completeAchievement(refererUserInfo.userAddress, "A03", userAddress, txHash, null, true);
            await this.achievementService.hideReferralAchievements("A01", refererUserInfo.userAddress, userAddress);
          }
          // R01 - Refer 5 new friends to open first position
          // existingAchievementRecord = await this.achievementService.findUserAchievementByCodeAndReferredUser("R01", userAddress);
          // if (existingAchievementRecord == null) {
          //   await this.achievementService.completeAchievement(refererUserInfo.userAddress, "R01", userAddress, txHash);
          // }
        }
        // // T01 - Trade 1 time every week
        // await this.achievementService.completeAchievement(userAddress, "T01", null, txHash);
        // // T02 - Trade 5 time every week
        // await this.achievementService.completeAchievement(userAddress, "T02", null, txHash);
        // // T04 - Trade 50 times in lifetime
        // await this.achievementService.completeAchievement(userAddress, "T04", null, txHash);
        // // E01 - Trade at least 1 time during trading competition
        // await this.achievementService.completeAchievement(userAddress, "E01", null, txHash);
        // if (decodedData.name === "openPosition") {
        //   // T03 - Open positions in more than 3 trading pairs
        //   await this.achievementService.completeAchievement(userAddress, "T03", null, txHash, [amm]);
        //   if (side == "0") {
        //     // Long
        //     // T05 - Open long positions in all trading pairs
        //     await this.achievementService.completeAchievement(userAddress, "T05", null, txHash, [amm]);
        //   } else {
        //     // T06 - Open short positions in all trading pairs
        //     await this.achievementService.completeAchievement(userAddress, "T06", null, txHash, [amm]);
        //   }
        // }
      } catch (e) {
        console.log(e);
      }
    }
    return new ApiResponse(ResponseStatus.Success).toObject();
  }

  @Authorized("auth-token")
  @Post("/users/trade/validateState")
  async validateState(@BodyParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.clearingHouseService.getLatestTradeRecord(userAddress);
    if (result) {
      await this.userService.updateUserInfos({
        data: {
          isInputCode: true,
          hasTraded: true
        },
        where: {
          userAddress: userAddress.toLowerCase()
        }
      });
    }
    let user = await this.userService.findUsersInfoByAddress(userAddress);
    return new ApiResponse(ResponseStatus.Success).setData({
      isInputCode: user.isInputCode,
      hasTraded: user.hasTraded
    }).toObject();
  }

  // @Get("/users/add/news")
  // async addNewsUser() {
  // const fakeUsers = require("/src/users.json")
  //   for (let i = 0; i < fakeUsers.length; i++) {
  //     const userinfo = fakeUsers[i];
  //     console.log(userinfo.userAddress.toLowerCase())
  //     await this.userService.createUserInfoService(userinfo.userAddress.toLowerCase())
  //   }
  // }

  @Get("/users/hasPartialClosed")
  async hasPartialClosed(@QueryParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.clearingHouseService.getLatestPartialCloseRecord(userAddress);
    return new ApiResponse(ResponseStatus.Success).setData({ hasPartialClosed: result != null }).toObject();
  }


  @Post("/users/username")
  async fetchUsernameByAddressList(@BodyParam("userAddressList", { required: true }) userAddressList: string[]) {
    if (userAddressList.length <= 500) {
      let params = []
      for (let i = 0; i < userAddressList.length; i++) {
        const element = userAddressList[i];
        let userAddress = element.toLowerCase()
        if (isAddress(userAddress)) {
          params.push(userAddress)
        } else {
          return new ApiResponse(ResponseStatus.Failure).setErrorMessage("address format not right")
        }
      }
      let result = await this.userService.fetchUsernameBy(params);
      return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
    }
  }

  @Get("/users/profile/:address")
  async socialProfile(@Param("address") userAddress: string) {
    if (isAddress(userAddress)) {
      let result = await this.userService.fetchUserSocialProfile(userAddress);
      return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
    } else {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage("address format not right")
    }
  }
}
