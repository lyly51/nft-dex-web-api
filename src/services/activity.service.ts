import { Service } from "typedi";
import prisma from "../helpers/client";
import { Events } from "@prisma/client";

@Service()
export class ActivityService {

    async create(title: string,
        description: string,
        startTime: number,
        endTime: number) {
        let currentDateTime = new Date();
        let currentTimestamp = Math.floor(Date.now() / 1000);
        let activity = {
            title: title,
            description: description,
            startTime: startTime,
            endTime: endTime,
            createTimestamp: currentTimestamp,
            updateTime: currentDateTime,
            updateTimestamp: currentTimestamp
        }

        return await prisma.events.create({
            data: activity,
        });
    }

    async findRunningActivities() {
        // let currentDateTime = new Date();
        let currentTimestamp = Math.floor(Date.now() / 1000);
        let result = await prisma.events.findMany({
            where: {
                endTime: {
                    gt: currentTimestamp
                }
            }
        });
        return result;
    }
    
}