import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req } from "routing-controllers";
import { ActivityService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { title } from "process";
import { Events } from "@prisma/client";




@JsonController()
@Service()
export class ActivityController {

    constructor(
        private activityService: ActivityService
    ) { }

    @Post("/activity/create")
    async createActivity(
        @BodyParam("title") title: string,
        @BodyParam("description") description: string,
        @BodyParam("startTime") startTime: number,
        @BodyParam("endTime") endTime: number) {

        let activity = await this.activityService.create(title, description, startTime, endTime);
        if (!activity) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage("activity create fail").toObject();
        } else {
            return new ApiResponse(ResponseStatus.Success).setData(activity).toObject();
        }
    }


    @Get("/activity/running/list")
    async activityList() {
        let list = await this.activityService.findRunningActivities();
        if (!list) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage("no any activities").toObject();
        } else {
            return new ApiResponse(ResponseStatus.Success).setData(list).toObject();
        }
    }

}