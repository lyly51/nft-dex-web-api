import { RoutingControllersOptions } from 'routing-controllers'
import * as controllers from '../src/controllers'
import * as middlewares from './routing.middlewares'
import * as interceptors from './interceptors'
import { dictToArray } from './utils'
import { Action } from 'routing-controllers';
import { ApiResponse, ResponseStatus } from 'src/helpers/apiResponse'
type CheckResult = { result: boolean, message: string };
export const routingConfigs: RoutingControllersOptions = {
  controllers: dictToArray(controllers),

  middlewares: dictToArray(middlewares),

  interceptors: dictToArray(interceptors),

  routePrefix: '/apis',

  validation: true,

  defaultErrorHandler: false,

  authorizationChecker: async (action: Action, roles: string[]) => {
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const apiTest = process.env.API_TEST;
      if (apiTest) {
        return true;
      }
      if (role == 'auth-token') {
        let checkMessage = "";
        let checkTokenResult = true;
        const token = action.request.headers['auth-token'];
        const userAddress = action.request.body.userAddress.toLowerCase();
        try {
          let decodedToken = await global.firebaseAdmin
            .auth()
            .verifyIdToken(token);
          console.log(`Decoded Token uid: ${decodedToken.uid}\nIssued at: ${decodedToken.auth_time}\nExpires at: ${decodedToken.exp}`)
          if (decodedToken.uid != userAddress) {
            checkTokenResult = false;
            checkMessage = `Invalid token for ${userAddress}, token is for ${decodedToken.uid.substring(0, 10)}`;
            console.error(checkMessage);
          }
        } catch (error) {
          checkMessage = error.message;
          checkTokenResult = false;
        }
        let checkResult: CheckResult = { result: checkTokenResult, message: checkMessage };
        if (!checkResult.result) {
          throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(checkResult.message);
        }
      }
    }

    return true
  },
}
