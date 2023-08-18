import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req } from "routing-controllers";
import { AdminService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";




@JsonController()
@Service()
export class AdminController {

    constructor(
        private adminService: AdminService
    ) { }

    @Post("/admin/login")
    async login(
        @BodyParam("email") email: string,
        @BodyParam("password") password: string) {
        try {
            let result = await this.adminService.loginAdmin(email, password);
            return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
        } catch (error) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message).toObject();
        }
    }


    @Post("/admin/reg")
    async register(
        @BodyParam("email") email: string,
        @BodyParam("password") password: string) {
        let result = await this.adminService.regAdmin(email, password);
        if (!result) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage("admin login field").toObject();
        } else {
            return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
        }
    }

}