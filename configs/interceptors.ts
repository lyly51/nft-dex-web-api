import { InterceptorInterface, Action, Interceptor } from 'routing-controllers'
import { Service } from 'typedi'

@Interceptor()
@Service()
export class AutoAssignJSONInterceptor implements InterceptorInterface {
  intercept(action: Action, content: any): any {
    if (typeof content === 'object') {
      let message = "success"
      if (content.code != 0) {
        message = "fail"
      }
      return JSON.stringify(Object.assign({ message: message }, content))
    }
    return JSON.stringify({ message: content })
  }
}
