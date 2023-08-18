import { JsonController, Post, BodyParam, Get } from "routing-controllers";
import { UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";

@JsonController()
@Service()
export class PostmanController {

    constructor(private userService: UserService) {

    }

    @Post("/postman/check/user/isfollow")
    async checkIsFollow(
        @BodyParam("userAddress", { required: true }) user: string,
        @BodyParam("followerAddress", { required: true }) follower: string
    ) {
        const apiTest = process.env.API_TEST;
        if (!apiTest) {
            throw Error("Not Found");
        }
        let result = await this.userService.isFollowUser(user, follower);
        if (result) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure).setErrorMessage("not exists");
    }
}