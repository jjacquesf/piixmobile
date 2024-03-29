import {authenticate} from '@loopback/authentication';
import {Binding, Interceptor, inject, intercept, service} from '@loopback/core';
import {
  HttpErrors,
  RequestContext,
  RestBindings,
  get,
  getModelSchemaRef,
  param,
  post,
  put,
  requestBody,
  response
} from '@loopback/rest';
import {PosSession, PosSessionDetail, Product, Sale, SaleDetails, StockMovementType} from '../models';

import {UserRepository} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {DefaultTransactionalRepository, Filter, WhereBuilder, repository} from '@loopback/repository';
import Ajv from 'ajv';
import {IProduct} from '../models/interfaces';
import {schemaSaleDetails} from '../models/schemas/sale.schemas';
import {BranchOfficeRepository, PosSessionRepository, PriceListPriceRepository, ProductRepository, ProfileRepository, SaleRepository, StockCountRepository, WarehouseRepository} from '../repositories';
import {FeaturedProductRepository} from '../repositories/featured-product.repository';
import {StockMovementService} from '../services';

const validateSaleSchema: Interceptor = async (invocationCtx, next) => {
  const details: SaleDetails = invocationCtx.args[0] || {};
  const ajv = new Ajv();
  const isValid = ajv.compile(schemaSaleDetails);

  if (!isValid(details)) {
    throw new HttpErrors[400]('El formato de datos enviados es invalido.');
  }
  const result = await next();
  return result;
};

const validateDiscount: Interceptor = async (invocationCtx, next) => {
  const details: SaleDetails = invocationCtx.args[0] || {};
  if (details.discount !== undefined) {
    if (details.discount.amount <= 0) {
      throw HttpErrors[400]('El descuento debe ser mayor a cero.');
    }
  }

  const result = await next();
  return result;
};

const validateItems: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const details: SaleDetails = invocationCtx.args[0] || {};
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const branchOfficeRepo = await invocationCtx.get<BranchOfficeRepository>(BranchOfficeRepository.BindingKey);
  const warehouseOfficeRepo = await invocationCtx.get<WarehouseRepository>(WarehouseRepository.BindingKey);
  const stockCountRepo = await invocationCtx.get<StockCountRepository>(StockCountRepository.BindingKey);
  const priceRepo = await invocationCtx.get<PriceListPriceRepository>(PriceListPriceRepository.BindingKey);
  const productRepo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  if (details.items.length == 0) {
    throw HttpErrors[400]('La venta requiere al menos un articulo.');
  }

  if (details.payments.length == 0) {
    throw HttpErrors[400]('La venta debe tener por lo menos un metodo de pago.');
  }

  const branchOffice = await branchOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.branchOfficeId);
  if (branchOffice == null) {
    throw HttpErrors[400]('No existe la sucursal en la organizacion.');
  }

  const warehouse = await warehouseOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.warehouseId);
  if (warehouse == null) {
    throw HttpErrors[400]('El almacen no existe en la sucursal especificada.');
  }

  if (details.branchOfficeId != warehouse.branchOfficeId) {
    throw HttpErrors[400]('El almacen especificado no pertenece a la sucursal selecionada.');
  }

  // let priceLists: PriceListPrice[] = [];

  for (let index = 0; index < details.items.length; index++) {
    if (details.items[index].branchOfficeId != details.branchOfficeId) {
      // Validate item branch office
      const tmp = await branchOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.items[index].branchOfficeId);
      if (tmp == null) {
        throw HttpErrors[400](`No existe la sucursal en la organizacion para la linea ${index + 1}.`);
      }

      // Validate item warehouse
      const tmp2 = await warehouseOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.items[index].warehouseId);
      if (tmp2 == null) {
        throw HttpErrors[400](`El almacen no existe en la sucursal especificada para la linea ${index + 1}.`);
      }
    }

    // Validate item min qty
    if (details.items[index].qty <= 0) {
      throw HttpErrors[400](`La cantidad debe ser mayor a cero en la linea ${index + 1}.`);
    }

    // Validate product type
    const product = await productRepo.findOne({
      where: {
        organizationId: organizationId,
        id: details.items[index].productId,
      }
    });

    if (product == null) {
      throw HttpErrors[400](`No existe el producto en la linea ${index + 1}.`);
    }

    details.items[index].isCommon = product.isCommon;

    if (product.isCommon) {
      if (details.items[index].price <= 0) {
        throw HttpErrors[400](`El precio debe ser mayor a cero en la linea ${index + 1}.`);
      }
    }

    if (!product.isCommon) {
      // Validate item product stock
      const tmp3 = await stockCountRepo.findOne({
        where: {
          organizationId: organizationId,
          warehouseId: details.items[index].warehouseId,
          productId: details.items[index].productId,
        }
      });

      if (tmp3 == null || tmp3.stock < details.items[index].qty) {
        throw HttpErrors[400](`No hay existencias suficientes para el producto en la linea ${index + 1}.`);
      }

      // Validate price list price
      const tmp4 = await priceRepo.findOne({
        where: {
          organizationId: organizationId,
          priceListId: details.items[index].priceListId,
          productId: details.items[index].productId,
        }
      });

      if (tmp4 == null) {
        throw HttpErrors[400](`No hay un precio registrado para el producto en la linea ${index + 1}.`);
      }

      // Set product price and name
      details.items[index].price = tmp4.price;
      details.items[index].productName = product.externalName;

      // Register pricelist price
      // priceLists.push(tmp4);
    }
  }

  const binding = Binding
    .bind<SaleDetails>(PosController.SaleDetailBindingKey)
    .to(details);

  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validateOpenSession: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const branchOfficeId: number = invocationCtx.args[0] || 0;
  const profileId = await invocationCtx.get<number>('USER_PROFILE_ID');
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const posSessionRepository = await invocationCtx.get<PosSessionRepository>(PosSessionRepository.BindingKey);

  let session = await posSessionRepository.getStarted(organizationId, profileId);

  if (session == null) {
    throw HttpErrors[404]('No hay una sesion de venta abierta por este usuario.');
  }

  const binding = Binding
    .bind<PosSession>(PosController.PosSessionBindingKey)
    .to(session);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validatePosSessionByProfileId: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  // const details: SaleDetails = invocationCtx.args[0] || {};
  const profileId = await invocationCtx.get<number>('USER_PROFILE_ID');
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');

  const posSessionRepository = await invocationCtx.get<PosSessionRepository>(PosSessionRepository.BindingKey);
  const saleRepository = await invocationCtx.get<SaleRepository>(SaleRepository.BindingKey);

  let session = await posSessionRepository.findOne({
    where: {
      organizationId: organizationId,
      sellerId: profileId,
      status: 'started'
    }
  });

  if (session == null) {
    throw HttpErrors[404]('No hay una sesion de venta abierta por este usuario.');
  }

  const binding = Binding
    .bind<PosSession>(PosController.PosSessionBindingKey)
    .to(session);
  reqCtx.add(binding);



  let sales: Sale[] = await saleRepository.find({where: {posSessionId: session.id}});
  const binding2 = Binding
    .bind<Sale[]>(PosController.SaleBindingKey)
    .to(sales);

  reqCtx.add(binding);
  reqCtx.add(binding2);

  const result = await next();
  return result;
};
@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN', 'SELLER']})
export class PosController {
  // public static ProductsPriceListBindingKey = 'PosController.ProductsPriceListKey';
  public static SaleDetailBindingKey = 'PosController.SaleDetailKey';
  public static PosSessionBindingKey = 'PosController.PosSessionKey';
  public static SaleBindingKey = 'PosController.SaleBindingKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @inject('USER_PROFILE_ID') public profileId: number,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(FeaturedProductRepository)
    public featuredProductRepository: FeaturedProductRepository,
    @repository(SaleRepository)
    public saleRepository: SaleRepository,
    @repository(BranchOfficeRepository)
    public branchOfficeRepository: BranchOfficeRepository,
    @repository(WarehouseRepository)
    public warehouseRepository: WarehouseRepository,
    @service(StockMovementService) private stockMovementService: StockMovementService,
    @repository(PosSessionRepository)
    public posSessionRepository: PosSessionRepository,
    @repository(ProfileRepository)
    public profileRepository: ProfileRepository,
    @repository(UserRepository) protected userRepository: UserRepository,
  ) { }

  @get('/pos/filter-products')
  @response(200, {
    description: 'IProduct model instance array',
  })
  async filterProducts(
    @param.query.string('query') query?: string,
    @param.query.boolean('featured-only') featuredOnly?: boolean,
  ): Promise<IProduct[]> {

    let ids: number[] = [];
    query = query != undefined ? `%${query}%` : '%';
    featuredOnly = featuredOnly == undefined ? false : featuredOnly;

    if (featuredOnly === true) {
      const featured = await this.featuredProductRepository.find({
        fields: ['productId'],
        where: {
          organizationId: this.organizationId,
        }
      });
      ids = featured.map(data => data.productId)
      if (ids.length == 0) {
        ids.push(-1);
      }
    }

    const domain = {
      organizationId: this.organizationId,
      // prices: {gt: 0},
      ...(ids.length != 0 ? {id: {inq: ids}} : {})
    };

    const whereBuilder = new WhereBuilder();
    whereBuilder
      .and(domain, {
        or: [
          {prices: {gt: 0}},
          {isCommon: true},
        ]
      }, {
        or: [
          {brand: {like: query}},
          {color: {like: query}},
          {model: {like: query}},
          {sku: {like: query}},
          {internalName: {like: query}},
          {externalName: {like: query}},
        ]
      });

    const where = whereBuilder.build();

    const filter: Filter<Product> = {
      order: ['externalName ASC'],
      where: where
    };

    const models = await this.productRepository.find(filter);

    const data: IProduct[] = [];
    for (let i = 0; i < models.length; i++) {
      data.push(await this.productRepository.toJSON(models[i]));
    }

    return data;
  }

  @intercept(validatePosSessionByProfileId)
  @intercept(validateSaleSchema)
  @intercept(validateDiscount)
  @intercept(validateItems)
  @post('/pos/sale')
  @response(200, {
    description: 'Sale model instance',
    content: {'application/json': {schema: getModelSchemaRef(SaleDetails)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SaleDetails, {
            title: 'NewSaleDetails',
            exclude: [
              'posSessionId'
            ]
          }),
        },
      },
    })
    details: SaleDetails,
  ): Promise<Sale> {
    const session = await this.requestCtx.get<PosSession>(PosController.PosSessionBindingKey);

    // const priceLists = await this.requestCtx.get<PriceListPrice[]>(PosController.ProductsPriceListBindingKey);
    // Get validated details
    details = await this.requestCtx.get<SaleDetails>(PosController.SaleDetailBindingKey);

    const profileId = await this.requestCtx.get<number>('USER_PROFILE_ID');

    if (details.shipping < 0) {
      throw new HttpErrors[400]('El costo de envio no puede ser menor a cero.');
    }

    let total: number = 0;
    for (let index = 0; index < details.items.length; index++) {
      // details.items[index].price = priceLists[index].price;
      total += details.items[index].qty * details.items[index].price;
    }

    total += details.shipping;

    let payments: number = 0
    for (let index = 0; index < details.payments.length; index++) {
      payments += details.payments[index].amount;
    }

    if (total > payments) {
      throw new HttpErrors[400](`Los pagos registrados son menores al total del pedido. Pago esperado: ${total.toFixed()}`);
    }

    const profile = await this.profileRepository.findOne({
      where: {
        id: details.sellerId,
        status: 1
      }
    });

    if (profile == null) {
      throw new HttpErrors[400](`El vendedor indicado NO existe.`);
    }

    const repo = new DefaultTransactionalRepository(Sale, this.saleRepository.dataSource);
    const tx = await repo.beginTransaction();

    const res = await this.saleRepository.create({
      organizationId: this.organizationId,
      branchOfficeId: details.branchOfficeId,
      posSessionId: session.id,
      sellerId: details.sellerId,
      sellerName: `${profile.firstName} ${profile.lastName}`,
      details: details,
      total: total,
    }, {transaction: tx});

    for (let index = 0; index < details.items.length; index++) {
      if (!details.items[index].isCommon) {
        await this.stockMovementService.create({
          profileId: profileId,
          organizationId: this.organizationId,
          branchOfficeId: details.items[index].branchOfficeId,
          warehouseId: details.items[index].warehouseId,
          productId: details.items[index].productId,
          type: StockMovementType.OUT,
          qty: details.items[index].qty,
          lot: `Venta #${res.id}`,
        }, tx);
      }
    }

    await tx.commit();
    return res;
  }

  @post('/pos/session')
  @response(200, {
    description: 'POS Session model instance',
    content: {'application/json': {schema: getModelSchemaRef(PosSession)}},
  })
  async createPosSession(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PosSession, {
            exclude: [
              'id',
              'organizationId',
              'sellerId',
              'created',
              'updated',
              'closed',
              'status',
              'total_qty',
              'total_amount',
              'comments',
            ]
          }),
        },
      },
    })
    details: Pick<PosSession, 'branchOfficeId'>,
  ): Promise<PosSessionDetail> {
    let session = await this.posSessionRepository.findOne({
      where: {
        organizationId: this.organizationId,
        sellerId: this.profileId,
        status: 'started'
      }
    });

    if (session !== null) {
      throw HttpErrors[400]('Ya hay una sesion de venta abierta por este usuario.');
    }
    const today = (new Date()).toISOString();
    session = await this.posSessionRepository.create({
      organizationId: this.organizationId,
      branchOfficeId: details.branchOfficeId,
      sellerId: this.profileId,
      status: 'started',
      total_qty: 0,
      total_amount: 0,
      created: today,
      updated: today
    })

    return new PosSessionDetail({
      session,
      sales: []
    });
  }

  @intercept(validatePosSessionByProfileId)
  @get('/pos/session')
  @response(200, {
    description: 'POS Session model instance',
    content: {'application/json': {schema: getModelSchemaRef(PosSession)}},
  })
  async getPosSessionByUser(): Promise<PosSessionDetail> {
    let session: PosSession | null = await this.requestCtx.get<PosSession>(PosController.PosSessionBindingKey);
    let sales: Sale[] | [] = await this.requestCtx.get<Sale[]>(PosController.SaleBindingKey);

    if (session == null) {
      throw HttpErrors[404]('No hay una sesion de venta abierta para este usuario');
    }

    session = await this.posSessionRepository.getStarted(session.organizationId, session.sellerId);
    if (session == null) {
      throw HttpErrors[404]('No hay una sesion de venta abierta para este usuario');
    }

    return new PosSessionDetail({
      session,
      sales
    });

    // return session;
  }

  @intercept(validateOpenSession)
  @put('/pos/session')
  @response(200, {
    description: 'POS Session model instance',
    content: {'application/json': {schema: getModelSchemaRef(PosSession)}},
  })
  async updatePosSession(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PosSession, {
            title: 'NewPosSessionDetails',
            exclude: [
              'id',
              'organizationId',
              'branchOfficeId',
              'sellerId',
              'created',
              'updated',
              'closed',
              'total_qty',
              'total_amount',
            ]
          }),
        },
      },
    })
    details: Pick<PosSession, 'status' | 'comments'>,
  ): Promise<PosSession> {

    const session = await this.requestCtx.get<PosSession>(PosController.PosSessionBindingKey);

    const today = (new Date()).toISOString();
    await this.posSessionRepository.updateById(session.id, {
      status: details.status,
      comments: details.comments,
      updated: today,
      ...(details.status === "closed" ? {closed: today} : {})
    });

    return await this.posSessionRepository.findById(session.id);
  }

}
