import {
  /* inject, */
  injectable,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ProfileRepository} from '../repositories';

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@injectable({tags: {key: AuthInterceptor.BINDING_KEY}})
export class AuthInterceptor implements Provider<Interceptor> {
  static readonly BINDING_KEY = `interceptors.${AuthInterceptor.name}`;

  constructor(@repository(ProfileRepository) protected profileRepository: ProfileRepository) { }


  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    try {
      // @inject(RestBindings.Http.REQUEST) request: RequestWithSession,
      // const request = await invocationCtx.get(RestBindings.Http.REQUEST, {optional: false});
      // const user = await invocationCtx.get(SecurityBindings.USER, {optional: false});
      // console.log({user});
      // if (user != undefined) {
      //   const profile = await this.profileRepository.find({where: {userId: user[securityId]}});
      //   request.sess
      // }
      // Add pre-invocation logic here
      const result = await next();
      // Add post-invocation logic here
      return result;
    } catch (err) {
      // Add error handling logic here
      throw err;
    }
  }
}
