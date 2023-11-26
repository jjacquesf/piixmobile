import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Binding, inject, intercept, Interceptor, InvocationContext, Next} from '@loopback/core';
import {
  Count,
  CountSchema,
  DefaultTransactionalRepository,
  Filter,
  repository,
  Where
} from '@loopback/repository';
import {
  del,
  getModelSchemaRef,
  param,
  patch,
  requestBody,
  RequestContext,
  response,
  RestBindings
} from '@loopback/rest';
import {PriceList, PriceListPrice, Product} from '../models';
import {PriceListPriceRepository, PriceListRepository, ProductRepository} from '../repositories';

const _validatePriceListExist = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const repo = await invocationCtx.get<PriceListRepository>(PriceListRepository.BindingKey);

  const filter: Filter<PriceList> = {
    where: {
      organizationId: organizationId
    }
  };
  const model = await repo.findById(id, filter);

  const binding = Binding
    .bind<PriceList>(PriceListPriceController.PriceListBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;

}

const _validateProductExists = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  const filter: Filter<PriceList> = {
    where: {
      organizationId: organizationId
    }
  };
  const model = await repo.findById(id, filter);

  const binding = Binding
    .bind<Product>(PriceListPriceController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validatePriceListExists: Interceptor = async (invocationCtx, next) => {
  const data: PriceListPrice = invocationCtx.args[0] || {};
  return await _validatePriceListExist(invocationCtx, next, data.priceListId);
};

const validateProductExists: Interceptor = async (invocationCtx, next) => {
  const data: PriceListPrice = invocationCtx.args[0] || {};
  return await _validateProductExists(invocationCtx, next, data.productId);
};

const validatePriceListExistsById: Interceptor = async (invocationCtx, next) => {
  const priceListId: number = invocationCtx.args[0] || 0;
  return await _validatePriceListExist(invocationCtx, next, priceListId);
};

const validateProductExistsById: Interceptor = async (invocationCtx, next) => {
  const productId: number = invocationCtx.args[1] || 0;
  return await _validateProductExists(invocationCtx, next, productId);
};

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
export class PriceListPriceController {
  public static PriceListBindingKey = 'PriceListPriceController.PriceListKey';
  public static ProductBindingKey = 'ProductPriceController.ProductKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(PriceListPriceRepository)
    public priceListPriceRepository: PriceListPriceRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
  ) { }

  @intercept(validatePriceListExists)
  @intercept(validateProductExists)
  @patch('/price-lists/price')
  @response(200, {
    description: 'PriceListPrice PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async set(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PriceListPrice, {
            partial: true,
            exclude: [
              'id', 'updated', 'created'
            ]
          }),
        },
      },
    })
    priceListPrice: Exclude<PriceListPrice, 'id,updated,created'>
  ): Promise<Count> {
    const priceList = await this.requestCtx.get<PriceList>(PriceListPriceController.PriceListBindingKey);
    const product = await this.requestCtx.get<Product>(PriceListPriceController.ProductBindingKey);

    const filter: Filter<PriceListPrice> = {
      where: {
        organizationId: this.organizationId,
        priceListId: priceList.id,
        productId: product.id,
      }
    }

    const price = await this.priceListPriceRepository.findOne(filter);


    const repo = new DefaultTransactionalRepository(PriceListPrice, this.priceListPriceRepository.dataSource);
    const tx = await repo.beginTransaction();

    if (price != null) {
      await this.priceListPriceRepository.execute(
        'UPDATE `price_list_price` SET `price`=? WHERE `id`=?',
        [priceListPrice.price, price.id],
        {transaction: tx}
      );
      await tx.commit();
      return Promise.resolve({count: 1});
    }

    Object.assign(priceListPrice, {organizationId: this.organizationId});
    await this.priceListPriceRepository.create(priceListPrice, {transaction: tx});

    await this.productRepository.updateById(product.id, {prices: product.prices + 1}, {transaction: tx});

    await tx.commit();

    return Promise.resolve({count: 1});
  }

  @intercept(validatePriceListExistsById)
  @intercept(validateProductExistsById)
  @del('/price-lists/price/{priceListId}/{productId}')
  @response(200, {
    description: 'PriceListPrice DELETE success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async delete(
    @param.path.number('priceListId') priceListId: number,
    @param.path.number('productId') productId: number
  ): Promise<Count> {
    const priceList = await this.requestCtx.get<PriceList>(PriceListPriceController.PriceListBindingKey);
    const product = await this.requestCtx.get<Product>(PriceListPriceController.ProductBindingKey);

    const filter: Where<PriceListPrice> = {
      organizationId: this.organizationId,
      priceListId: priceList.id,
      productId: product.id,
    }

    const repo = new DefaultTransactionalRepository(PriceListPrice, this.priceListPriceRepository.dataSource);
    const tx = await repo.beginTransaction();

    const res = await this.priceListPriceRepository.deleteAll(filter, {transaction: tx});

    await this.productRepository.updateById(product.id, {prices: product.prices - res.count}, {transaction: tx});

    await tx.commit();
    return res;
  }
}
