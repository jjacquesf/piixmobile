import {AuthorizationContext, AuthorizationDecision, AuthorizationMetadata, Authorizer} from '@loopback/authorization';
import { /* inject, */ BindingScope, Provider, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ProfileRepository} from '../repositories';
import {ProfileRoleRepository} from '../repositories/profile-role.repository';

/*
 * Fix the service type. Possible options can be:
 * - import {CustomAuthorizationProvider} from 'your-module';
 * - export type CustomAuthorizationProvider = string;
 * - export interface CustomAuthorizationProvider {}
 */
export type CustomAuthorizationProvider = unknown;

@injectable({scope: BindingScope.TRANSIENT})
export class CustomAuthorizationProviderProvider implements Provider<Authorizer> {
  public static BindingKey = `CustomAuthorizationProviderProvider.BindingKey`;
  constructor(
    @inject('USER_ROLES') public userRoles: string[],
    @repository(ProfileRoleRepository) protected profileRoleRepository: ProfileRoleRepository,
    @repository(ProfileRepository) protected profileRepository: ProfileRepository
  ) { }

  value(): Authorizer {
    return this.authorize.bind(this);
  }


  async authorize(
    authorizationCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    // authorizationCtx.principals contains user model

    const allowedRoles = metadata.allowedRoles || [];
    if (allowedRoles.length == 0) {
      return AuthorizationDecision.ALLOW;
    }

    const authorizedRoles = this.userRoles.filter(userRole => allowedRoles.includes(userRole));

    return authorizedRoles.length != 0
      ? AuthorizationDecision.ALLOW
      : AuthorizationDecision.DENY;
  }
}
