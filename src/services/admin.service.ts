import { Md5 } from "ts-md5";
import { Service } from "typedi";
import prisma from "../helpers/client";

@Service()
export class AdminService {

    async loginAdmin(email: string, password: string) {
        try {
            let result = await prisma.adminUser.findFirstOrThrow({ where: { email: email, password: password } })
            return result
        } catch (error) {
            throw new Error(error.message)
        }

    }

    async regAdmin(email: string, password: string) {
        let admin = await prisma.adminUser.findUnique({ where: { email: email } })
        if (admin == null) {
            let data = { email: email, password: Md5.hashStr(password) }
            let result = await prisma.adminUser.create({ data: data })
            return result;
        }
        return null
    }
}