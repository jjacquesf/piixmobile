import {authenticate} from '@loopback/authentication';
import {Binding, inject, intercept, Interceptor} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where
} from '@loopback/repository';
import {
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

const validatePriceListExists: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const repo = await invocationCtx.get<PriceListRepository>(PriceListRepository.BindingKey);

  const data: PriceListPrice = invocationCtx.args[0] || {};

  const filter: Filter<PriceList> = {
    where: {
      organizationId: organizationId
    }
  };
  const model = await repo.findById(data.priceListId, filter);

  const binding = Binding
    .bind<PriceList>(PriceListPriceController.PriceListBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validateProductExists: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  const data: PriceListPrice = invocationCtx.args[0] || {};

  const filter: Filter<PriceList> = {
    where: {
      organizationId: organizationId
    }
  };
  const model = await repo.findById(data.productId, filter);

  const binding = Binding
    .bind<Product>(PriceListPriceController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};


@authenticate('jwt')
export class PriceListPriceController {
  public static PriceListBindingKey = 'PriceListPriceController.PriceListKey';
  public static ProductBindingKey = 'ProductPriceController.ProductKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(PriceListPriceRepository)
    public priceListPriceRepository: PriceListPriceRepository,
  ) { }

  @intercept(validatePriceListExists)
  @intercept(validateProductExists)
  @patch('/price-lists/price')
  @response(200, {
    description: 'PriceListPrice PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async price(
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
    priceListPrice: Exclude<PriceListPrice, 'id,updated,created'>,
    @param.where(PriceListPrice) where?: Where<PriceListPrice>,
  ): Promise<Count> {
    const priceList = await this.requestCtx.get<PriceList>(PriceListPriceController.PriceListBindingKey);
    const product = await this.requestCtx.get<Product>(PriceListPriceController.ProductBindingKey);

    where = {
      ...where,
      organizationId: this.organizationId,
      priceListId: priceList.id,
      productId: product.id,
    }

    const filter: Filter<PriceListPrice> = {
      where: {
        organizationId: this.organizationId,
        priceListId: priceList.id,
        productId: product.id,
      }
    }

    const price = await this.priceListPriceRepository.findOne(filter);

    if (price != null) {
      await this.priceListPriceRepository.execute(
        'UPDATE `price_list_price` SET `price`=? WHERE `id`=?',
        [priceListPrice.price, price.id]
      );
      return Promise.resolve({count: 1});
    }

    Object.assign(priceListPrice, {organizationId: this.organizationId});
    await this.priceListPriceRepository.create(priceListPrice);

    return Promise.resolve({count: 1});
  }

}
