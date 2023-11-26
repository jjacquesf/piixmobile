// Uncomment these imports to begin using these cool features!

import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Binding, Interceptor, inject, intercept, service} from '@loopback/core';
import {DataObject, Filter, repository} from '@loopback/repository';
import {HttpErrors, RequestContext, RestBindings, getModelSchemaRef, post, requestBody, response} from '@loopback/rest';
import {AuthInterceptor} from '../interceptors';
import {Product, StockMovement, StockMovementType, Warehouse} from '../models';
import {ProductRepository, WarehouseRepository} from '../repositories';
import {StockCountRepository} from '../repositories/stock-count.repository';
import {StockMovementRepository} from '../repositories/stock-movement.repository';
import {StockMovementService} from '../services';

const validateWarehouseOwnership: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<WarehouseRepository>(WarehouseRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const data: DataObject<StockMovement> = invocationCtx.args[0] || {};

  const filter: Filter<Warehouse> = {
    where: {
      id: data.warehouseId,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('El almacen especificado no pertenece a la organización.');
  }

  const binding = Binding
    .bind<Warehouse>(StockMovementController.WarehouseBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validateStockMovementType: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const data: DataObject<StockMovement> = invocationCtx.args[0] || {};

  const type = data?.type || 0;

  if (!Object.values(StockMovementType).includes(type)) {
    throw new HttpErrors[422]('Tipo de movimiento de almacen invalido.');
  }

  const typeBinding = Binding
    .bind<number>(StockMovementController.TypeBindingKey)
    .to(type);
  reqCtx.add(typeBinding);

  const result = await next();
  return result;
};

const validateProductOwnership: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const data: DataObject<StockMovement> = invocationCtx.args[0] || {};

  const filter: Filter<Product> = {
    where: {
      id: data?.productId,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('El producto especificado no pertenece a la organización.');
  }

  const binding = Binding
    .bind<Product>(StockMovementController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
@intercept(
  AuthInterceptor.BINDING_KEY
)
export class StockMovementController {
  public static StockCountBindingKey = 'StockMovementController.StockCountKey';
  public static WarehouseBindingKey = 'StockMovementController.WarehouseKey';
  public static ProductBindingKey = 'StockMovementController.ProductKey';
  public static TypeBindingKey = 'StockMovementController.TypeKey';
  public static QtyBindingKey = 'StockMovementController.Qty';
  public static StockBeforeBindingKey = 'StockMovementController.StockBefore';
  public static StockAfterBindingKey = 'StockMovementController.StockAfter';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @repository(StockMovementRepository) public stockMovementRepository: StockMovementRepository,
    @repository(StockCountRepository) public stockCountRepository: StockCountRepository,
    @service(StockMovementService) private stockMovementService: StockMovementService) { }

  @intercept(validateStockMovementType)
  @intercept(validateWarehouseOwnership)
  @intercept(validateProductOwnership)
  @post('/stock-movement')
  @response(200, {
    description: 'StockMovement model instance',
    content: {'application/json': {schema: getModelSchemaRef(StockMovement)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StockMovement, {
            title: 'NewStockMovement',
            exclude: ['id', 'organizationId', 'branchOfficeId', 'created', 'updated', 'profileId', 'stockBefore', 'stockAfter'],
          }),
        },
      },
    })
    stockMovement: Omit<StockMovement, 'id,organizationId,branchOfficeId,created,updated,profileId,stockBefore,stockAfter'>,
  ): Promise<StockMovement> {

    const profileId = await this.requestCtx.get<number>('USER_PROFILE_ID');
    const warehouse = await this.requestCtx.get<Warehouse>(StockMovementController.WarehouseBindingKey);
    const type = await this.requestCtx.get<number>(StockMovementController.TypeBindingKey);

    const movement = await this.stockMovementService.create({
      profileId: profileId,
      organizationId: warehouse.organizationId,
      branchOfficeId: warehouse.branchOfficeId,
      warehouseId: stockMovement.warehouseId,
      productId: stockMovement.productId,
      type: type,
      qty: stockMovement.qty,
      lot: stockMovement.lot || '',
    })

    return movement;
  }
}
