import Koa from "koa";
import logger from "koa-logger";
import bodyParser from "koa-bodyparser";
import { isProd } from "./constants";

export const useMiddlewares = <T extends Koa>(app: T): T => {
  if (isProd()) {
    app.use(logger());
  }

  app.proxy = true;
  app.use(bodyParser());

  // Add error handling middleware
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // Handle error here
      console.error(error);
      ctx.status = error.httpCode || 500;
      ctx.body = {
        message: "error"
      };
    }
  });

  return app;
};
