import {authenticate} from '@loopback/authentication';
import {Binding, Interceptor, inject, intercept, service} from '@loopback/core';
import {DefaultTransactionalRepository, Filter, WhereBuilder, repository} from '@loopback/repository';
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
import Ajv from 'ajv';
import {PriceListPrice, Product, Sale, SaleDetails, StockMovementType} from '../models';
import {IProduct} from '../models/interfaces';

import {schemaSaleDetails} from '../models/schemas';
import {BranchOfficeRepository, PriceListPriceRepository, ProductRepository, SaleRepository, StockCountRepository, WarehouseRepository} from '../repositories';
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


  if (details.items.length == 0) {
    throw HttpErrors[400]('La venta requiere al menos un articulo.');
  }

  if (details.payments.length == 0) {
    throw HttpErrors[400]('La venta debe tener por lo menos un metodo de pago.');
  }

  const branchOffice = await branchOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.branchOfficeId);
  if (branchOffice == null) {
    throw HttpErrors[401]('No estas autorizado para crear pedidos en la sucursal especificada.');
  }

  const warehouse = await warehouseOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.warehouseId);
  if (warehouse == null) {
    throw HttpErrors[401]('No estas autorizado para crear pedidos en la sucursal especificada.');
  }

  if (details.branchOfficeId != warehouse.branchOfficeId) {
    throw HttpErrors[401]('El almacen especificado no pertenece a la sucursal selecionada.');
  }

  let priceLists: PriceListPrice[] = [];

  for (let index = 0; index < details.items.length; index++) {
    if (details.items[index].branchOfficeId != details.branchOfficeId) {
      // Validate item branch office
      const tmp = await branchOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.items[index].branchOfficeId);
      if (tmp == null) {
        throw HttpErrors[401](`No estas autorizado para crear pedidos en la sucursal especificada en la linea ${index + 1}.`);
      }

      // Validate item warehouse
      const tmp2 = await warehouseOfficeRepo.findByIdAndOwnerOrganization(organizationId, details.items[index].warehouseId);
      if (tmp2 == null) {
        throw HttpErrors[401](`No estas autorizado para crear pedidos en la sucursal especificada en la linea ${index + 1}.`);
      }
    }

    // Validate item min qty
    if (details.items[index].qty <= 0) {
      throw HttpErrors[401](`La cantidad debe ser mayor a cero en la linea ${index + 1}.`);
    }

    // Validate item product stock
    const tmp3 = await stockCountRepo.findOne({
      where: {
        organizationId: organizationId,
        warehouseId: details.items[index].warehouseId,
        productId: details.items[index].productId,
      }
    });

    if (tmp3 == null || tmp3.stock < details.items[index].qty) {
      throw HttpErrors[401](`No hay existencias suficientes para el produco en la linea ${index + 1}.`);
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
      throw HttpErrors[401](`No hay un precio registrado para el producto en la linea ${index + 1}.`);
    }

    // Register pricelist price
    priceLists.push(tmp4);
  }

  const binding = Binding
    .bind<PriceListPrice[]>(PosController.ProductsPriceListBindingKey)
    .to(priceLists);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

@authenticate('jwt')
export class PosController {
  public static ProductsPriceListBindingKey = 'PosController.ProductsPriceListKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID')
    public organizationId: number,
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
    @service(StockMovementService) private stockMovementService: StockMovementService
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
      prices: {gt: 0},
      ...(ids.length != 0 ? {id: {inq: ids}} : {})
    };

    const whereBuilder = new WhereBuilder();
    whereBuilder
      .and(domain, {
        or: [
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
            title: 'NewSaleDetails'
          }),
        },
      },
    })
    details: SaleDetails,
  ): Promise<Sale> {
    const priceLists = await this.requestCtx.get<PriceListPrice[]>(PosController.ProductsPriceListBindingKey);

    const profileId = await this.requestCtx.get<number>('USER_PROFILE_ID');

    let total: number = 0;
    for (let index = 0; index < details.items.length; index++) {
      details.items[index].price = priceLists[index].price;
      total += details.items[index].qty * details.items[index].price;
    }

    const repo = new DefaultTransactionalRepository(Sale, this.saleRepository.dataSource);
    const tx = await repo.beginTransaction();

    const res = await this.saleRepository.create({
      organizationId: this.organizationId,
      branchOfficeId: details.branchOfficeId,
      details: details,
      total: total,
    }, {transaction: tx});

    for (let index = 0; index < details.items.length; index++) {
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

    await tx.commit();
    return res;
  }
}
