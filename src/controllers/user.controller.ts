// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,
  TokenServiceBindings,
  User,
  UserRepository,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {Entity, model, property, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  SchemaObject,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {Profile} from '../models/profile.model';
import {OrganizationRepository, ProfileRepository, RoleRepository} from '../repositories';
import {ProfileRoleRepository} from '../repositories/profile_role.repository';

@model()
export class NewUserRequest extends Entity {
  @property({
    type: 'number',
    required: true,
  })
  organizationId: number;

  @property({
    type: 'number',
    required: true,
  })
  roleId: number;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'string',
    required: true,
  })
  firstName: string;

  @property({
    type: 'string',
    required: true,
  })
  lastName: string;

}

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export class UserController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @repository(ProfileRepository) protected profileRepository: ProfileRepository,
    @repository(OrganizationRepository) protected organizationRepository: OrganizationRepository,
    @repository(RoleRepository) protected roleRepository: RoleRepository,
    @repository(ProfileRoleRepository) protected profileRoleRepository: ProfileRoleRepository,
  ) { }

  @post('/auth/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);
    return {token};
  }


  @authenticate('jwt')
  @get('/auth/me', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: Profile,
          },
        },
      },
    },
  })
  async me(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<Profile | null> {
    return this.profileRepository.find({where: {userId: currentUserProfile[securityId]}})
      .then((profiles: Profile[]) => {
        if (profiles.length) {
          const [profile] = profiles;
          return profile;
        }

        throw new Error('Unable to get profile');

      })
      .catch((e) => {
        throw e;
      });
  }

  @post('/auth/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
  ): Promise<User> {

    const organization = await this.organizationRepository.findById(newUserRequest.organizationId);
    const role = await this.roleRepository.findById(newUserRequest.roleId);

    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create(
      _.omit(newUserRequest, ['password', 'organizationId', 'roleId', 'firstName', 'lastName']),
    );

    await this.userRepository.userCredentials(savedUser.id).create({password});

    const profile = await this.profileRepository.create({
      userId: savedUser.id,
      firstName: newUserRequest.firstName,
      lastName: newUserRequest.lastName,
      status: 1,
      organizationId: organization.id
    });

    const profileRole = await this.profileRoleRepository.create({
      profileId: profile.id,
      roleId: role.id,
    });


    return savedUser;
  }
}
