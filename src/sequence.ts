// import {MiddlewareSequence} from '@loopback/rest';
// export class MySequence extends MiddlewareSequence { }

import {AUTHENTICATION_STRATEGY_NOT_FOUND, AuthenticateFn, AuthenticationBindings, USER_PROFILE_NOT_FOUND} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {FindRoute, InvokeMethod, ParseParams, Reject, RequestContext, RestBindings, Send, SequenceHandler} from '@loopback/rest';

const SequenceActions = RestBindings.SequenceActions;

const parseToken = (token: string | undefined) => {
  if (!token) return '';
  const [type, value] = token.split('Bearer ');
  return value;
}

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,
    @inject(AuthenticationBindings.AUTH_ACTION) protected authenticateRequest: AuthenticateFn
  ) { }

  async handle(context: RequestContext): Promise<void> {
    try {
      const {request, response} = context;

      response.header('Access-Control-Allow-Origin', '*');
      response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      if (request.method == 'OPTIONS') {
        response.status(200)
        this.send(response, 'ok');
      } else {
        const route = this.findRoute(request);
        // console.log('route', route.path);
        // - enable jwt auth -
        // call authentication action
        await this.authenticateRequest(request);
        const args = await this.parseParams(request, route);
        // console.log('args', args);
        const result = await this.invoke(route, args);
        // console.log('result', result);
        this.send(response, result);
      }
    } catch (err) {
      // if error is coming from the JWT authentication extension
      // make the statusCode 401
      if (
        err.code === AUTHENTICATION_STRATEGY_NOT_FOUND ||
        err.code === USER_PROFILE_NOT_FOUND
      ) {
        Object.assign(err, {statusCode: 401 /* Unauthorized */});
      }
      this.reject(context, err);
    }
  }
}
