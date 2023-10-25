// import {MiddlewareSequence} from '@loopback/rest';
// export class MySequence extends MiddlewareSequence { }

import {AUTHENTICATION_STRATEGY_NOT_FOUND, AuthenticateFn, AuthenticationBindings, USER_PROFILE_NOT_FOUND} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {FindRoute, InvokeMethod, ParseParams, Reject, RequestContext, RestBindings, Send, SequenceHandler} from '@loopback/rest';
import {securityId} from '@loopback/security';
import cors from 'cors';
import {ProfileRepository} from './repositories';

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
    @inject(AuthenticationBindings.AUTH_ACTION) protected authenticateRequest: AuthenticateFn,
    @repository(ProfileRepository) protected profileRepository: ProfileRepository
  ) { }

  async handle(context: RequestContext): Promise<void> {
    try {
      const {request, response} = context;
      cors({})(request, response, () => { });

      if (request.method === 'OPTIONS') {
        return Promise.resolve();
      }

      const route = this.findRoute(request);
      const user = await this.authenticateRequest(request);
      if (user != undefined) {
        const profile = await this.profileRepository.findOne({where: {userId: user[securityId]}});
        if (profile?.organizationId != undefined) {
          context.bind('USER_ORGANIZATION_ID').to(profile?.organizationId);
          context.bind('USER_PROFILE_ID').to(profile?.id);
        }
      }
      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);

      this.send(response, result);
    } catch (err) {
      console.log(err);
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
