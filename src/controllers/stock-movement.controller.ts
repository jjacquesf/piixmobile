// Uncomment these imports to begin using these cool features!

import {authenticate} from '@loopback/authentication';
import {Binding, Interceptor, inject, intercept} from '@loopback/core';
import {DataObject, DefaultTransactionalRepository, Filter, repository} from '@loopback/repository';
import {HttpErrors, RequestContext, RestBindings, getModelSchemaRef, post, requestBody, response} from '@loopback/rest';
import {AuthInterceptor} from '../interceptors';
import {Product, StockCount, StockMovement, StockMovementType, Warehouse} from '../models';
import {ProductRepository, WarehouseRepository} from '../repositories';
import {StockCountRepository} from '../repositories/stock-count.repository';
import {StockMovementRepository} from '../repositories/stock-movement.repository';

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

const validateStock: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<StockCountRepository>(StockCountRepository.BindingKey);
  const warehouse = await reqCtx.get<Warehouse>(StockMovementController.WarehouseBindingKey);
  const data: DataObject<StockMovement> = invocationCtx.args[0] || {};

  let count = await repo.findOne({
    where: {
      warehouseId: data.warehouseId,
      productId: data.productId,
    }
  });

  if (count == null) {
    const cdata = new StockCount({
      organizationId: warehouse.organizationId,
      branchOfficeId: warehouse.branchOfficeId,
      warehouseId: warehouse.id,
      productId: data.productId,
      stock: 0,
    });
    count = await repo.create(cdata);
  }



  const qty = data.qty || 0;
  if (qty < 0) {
    throw new HttpErrors[422]('La cantidad debe ser mayor o igual a cero.');
  }

  const s_before = count != null ? count.stock : 0;
  let s_after = s_before;

  switch (data.type) {
    case StockMovementType.SET:
      s_after = qty;
      break;
    case StockMovementType.IN:
      s_after += qty;
      if (qty < 0) {
        throw new HttpErrors[422]('La cantidad debe ser mayor a cero.');
      }
      break;
    case StockMovementType.OUT:
      s_after -= qty;
      if (s_after < 0) {
        throw new HttpErrors[422]('La cantidad debe ser menor o igual a las existencias.');
      }
      break;
  }

  const stockCountBinding = Binding
    .bind<StockCount>(StockMovementController.StockCountBindingKey)
    .to(count);

  const qtyBinding = Binding
    .bind<number>(StockMovementController.QtyBindingKey)
    .to(qty);

  const beforeBinding = Binding
    .bind<number>(StockMovementController.StockBeforeBindingKey)
    .to(s_before);


  const afterBinding = Binding
    .bind<number>(StockMovementController.StockAfterBindingKey)
    .to(s_after);

  reqCtx.add(stockCountBinding);
  reqCtx.add(qtyBinding);
  reqCtx.add(beforeBinding);
  reqCtx.add(afterBinding);

  const result = await next();
  return result;
};

@authenticate('jwt')
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
    @repository(StockCountRepository) public stockCountRepository: StockCountRepository) { }

  @intercept(validateStockMovementType)
  @intercept(validateWarehouseOwnership)
  @intercept(validateProductOwnership)
  @intercept(validateStock)
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
    const stockCount = await this.requestCtx.get<StockCount>(StockMovementController.StockCountBindingKey);
    const warehouse = await this.requestCtx.get<Warehouse>(StockMovementController.WarehouseBindingKey);
    const product = await this.requestCtx.get<Product>(StockMovementController.ProductBindingKey);
    const type = await this.requestCtx.get<number>(StockMovementController.TypeBindingKey);
    const qty = await this.requestCtx.get<number>(StockMovementController.QtyBindingKey);
    const s_before = await this.requestCtx.get<number>(StockMovementController.StockBeforeBindingKey);
    const s_after = await this.requestCtx.get<number>(StockMovementController.StockAfterBindingKey);

    const repo = new DefaultTransactionalRepository(StockMovement, this.stockMovementRepository.dataSource);
    const tx = await repo.beginTransaction();

    const movement = await this.stockMovementRepository.create({
      profileId: profileId,
      organizationId: warehouse.organizationId,
      branchOfficeId: warehouse.branchOfficeId,
      warehouseId: warehouse.id,
      productId: product.id,
      type: type,
      qty: qty,
      stockBefore: s_before,
      stockAfter: s_after,
      lot: stockMovement.lot || '',
    }, {transaction: tx});

    // const updatedStock = await this.stockCountRepository.findById(stock.id);
    Object.assign(stockCount, {stock: s_after});
    console.log({
      stock: stockCount.stock
    })
    await this.stockCountRepository.replaceById(stockCount.id, stockCount, {transaction: tx});

    await tx.commit();

    return movement;
  }
}
