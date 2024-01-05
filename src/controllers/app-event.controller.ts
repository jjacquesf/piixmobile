import {Binding, Interceptor, inject, intercept} from '@loopback/core';
import {
  Filter,
  repository
} from '@loopback/repository';
import {
  HttpErrors,
  RequestContext,
  RestBindings,
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import _ from 'lodash';


import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';

import {AppEvent, PosSession, Product} from '../models';
import {AppEventRepository, PosSessionRepository, ProductRepository} from '../repositories';

const validatePosSessionId: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const data: Omit<AppEvent, 'id' | 'organizationId' | 'branchOfficeId' | 'profileId' | 'created' | 'updated'> = invocationCtx.args[0] || 0;
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const posSessionRepository = await invocationCtx.get<PosSessionRepository>(PosSessionRepository.BindingKey);


  if (_.isNil(data.posSessionId)) {
    return await next();
  }

  let model = await posSessionRepository.findOne({
    where: {
      organizationId: organizationId,
      id: data.posSessionId,
    }
  })

  if (model == null) {
    throw HttpErrors[404]('No hay una sesion de venta abierta con el id especificado.');
  }

  const binding = Binding
    .bind<PosSession>(AppEventController.PosSessionBindingKey)
    .to(model);
  reqCtx.add(binding);

  return await next();
};

const validateProductId: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const data: Omit<AppEvent, 'id' | 'organizationId'> = invocationCtx.args[0] || 0;
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const productRepository = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  if (_.isNil(data.productId) && data.type === 'NO_STOCK') {
    throw HttpErrors[400]('El producto es requerido para eventos de stock.');
  }

  if (_.isNil(data.productId)) {
    return await next();
  }

  let model = await productRepository.findOne({
    where: {
      organizationId: organizationId,
      id: data.productId,
    }
  })

  if (model == null) {
    throw HttpErrors[404]('La sucursal especificada no existe en la organizacion.');
  }

  const binding = Binding
    .bind<Product>(AppEventController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);

  return await next();
};

@authenticate('jwt')
export class AppEventController {
  public static PosSessionBindingKey = 'AppEventController.PosSessionKey';
  public static BranchOfficeBindingKey = 'AppEventController.BranchOffice';
  public static ProductBindingKey = 'AppEventController.Product';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @inject('USER_PROFILE_ID') public profileId: number,
    @repository(AppEventRepository)
    public appEventRepository: AppEventRepository,
  ) { }

  @intercept(validatePosSessionId)
  @intercept(validateProductId)
  @post('/app-events')
  @response(200, {
    description: 'AppEvent model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(AppEvent, {
          exclude: [
            'id',
            'organizationId',
            'branchOfficeId',
            'profileId',
            'created',
            'updated',
          ]
        })
      }
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AppEvent, {
            title: 'NewAppEvent',
            exclude: ['id', 'organizationId', 'branchOfficeId', 'profileId', 'created', 'updated'],
          }),
        },
      },
    })
    appEvent: Omit<AppEvent, 'id' | 'organizationId' | 'branchOfficeId' | 'profileId' | 'created' | 'updated'>,
  ): Promise<AppEvent> {
    let session: PosSession | undefined = undefined;
    try {session = await this.requestCtx.get<PosSession>(AppEventController.PosSessionBindingKey);} catch (error) { }

    const today = (new Date()).toISOString();
    console.log(session)
    console.log({
      ...appEvent,
      ...(session !== undefined ? {
        posSessionId: session.id,
        branchOfficeId: session.branchOfficeId
      } : {}),
      organizationId: this.organizationId,
      profileId: this.profileId,
      created: today,
      updated: today,
    })
    return this.appEventRepository.create({
      ...appEvent,
      ...(session !== undefined ? {
        posSessionId: session.id,
        branchOfficeId: session.branchOfficeId
      } : {}),
      organizationId: this.organizationId,
      profileId: this.profileId,
      created: today,
      updated: today,
    });
  }

  @authorize({allowedRoles: ['ADMIN']})
  @get('/app-events')
  @response(200, {
    description: 'Array of AppEvent model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(AppEvent, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(AppEvent) filter?: Filter<AppEvent>,
  ): Promise<AppEvent[]> {
    return this.appEventRepository.find(filter);
  }
}
