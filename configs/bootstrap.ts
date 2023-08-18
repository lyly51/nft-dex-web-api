import { print } from "./utils";
import dotenv, { DotenvParseOutput } from "dotenv";
import path from "path";
import fs from "fs";
import { Prisma } from "@prisma/client";

// "before" will trigger before the app lift.
export const bootstrapBefore = (): DotenvParseOutput | undefined => {
  Prisma.Decimal.set({ rounding: Prisma.Decimal.ROUND_FLOOR, toExpPos: 1000, toExpNeg: -1000 });
  // const result = dotenv.config({ path: join(__dirname, "../.env") });
  // 先构造出.env*文件的绝对路径
  const appDirectory = fs.realpathSync(process.cwd());
  const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);
  const pathsDotenv = resolveApp(".env");

  // 按优先级由高到低的顺序加载.env文件
  const run_env = process.env.NODE_ENV;
  
  if (run_env == 'LOCAL') {
    var result = dotenv.config({ path: `${pathsDotenv}.local` });  // 加载.env.local    
  } else if (run_env == 'DEVELOPMENT') {
    var result = dotenv.config({ path: `${pathsDotenv}.development` })  // 加载.env.development    
  } else if (run_env == 'PRODUCTION') {
    var result = dotenv.config({ path: `${pathsDotenv}.campaign` })
  } else {
    var result = dotenv.config({ path: `${pathsDotenv}` })  // 加载.env
  }
  
  if (result.error) {
    print.danger('Environment variable not loaded: not found ".env" file.');
    return {};
  }
  // solve ncc path link.
  print.log(".env loaded.");
  return result.parsed;
};

// "after" will trigger after the "container" mounted..
export const bootstrapAfter = (): any => { };
