import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Binding, Interceptor, inject, intercept} from '@loopback/core';
import {
  DataObject,
  DefaultTransactionalRepository,
  Filter,
  FilterExcludingWhere,
  Where,
  repository
} from '@loopback/repository';
import {
  HttpErrors,
  RequestContext,
  RestBindings,
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {PriceList, PriceListPrice} from '../models';
import {PriceListPriceRepository, PriceListRepository, ProductRepository} from '../repositories';

const validatePriceListExists: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const organizationId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const repo = await invocationCtx.get<PriceListRepository>(PriceListRepository.BindingKey);

  const id: number = invocationCtx.args[0] || 0;
  const orgFilter: Filter<PriceList> = {
    where: {
      organizationId: organizationId
    }
  };
  const model = await repo.findById(id, orgFilter);

  const binding = Binding
    .bind<PriceList>(PriceListController.PriceListBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
export class PriceListController {
  public static OrganizationBindingKey = 'PriceListController.OrganizationKey';
  public static PriceListBindingKey = 'PriceListController.PriceListKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(PriceListRepository)
    public priceListRepository: PriceListRepository,
    @repository(PriceListPriceRepository)
    public priceListPriceRepository: PriceListPriceRepository,
    @repository(ProductRepository) public productRepository: ProductRepository,

  ) { }

  @post('/price-lists')
  @response(200, {
    description: 'PriceList model instance',
    content: {'application/json': {schema: getModelSchemaRef(PriceList)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PriceList, {
            title: 'NewPriceList',
            exclude: ['id', 'organizationId'],
          }),
        },
      },
    })
    priceList: Omit<PriceList, 'id,organizationId'>,
  ): Promise<PriceList> {

    const repo = new DefaultTransactionalRepository(PriceList, this.priceListRepository.dataSource);
    const tx = await repo.beginTransaction();

    Object.assign(priceList, {organizationId: this.organizationId});
    const res = await this.priceListRepository.create(priceList, {transaction: tx});

    if (res.isDefault == true) {
      const data: DataObject<PriceList> = {isDefault: false}
      const where: Where<PriceList> = {organizationId: this.organizationId, id: {neq: res.id}};
      await this.priceListRepository.updateAll(data, where, {transaction: tx});
    }

    await tx.commit();
    return res;
  }

  @get('/price-lists')
  @response(200, {
    description: 'Array of PriceList model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(PriceList, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(PriceList) filter?: Filter<PriceList>,
  ): Promise<PriceList[]> {
    filter = {
      ...filter,
      where: {
        ...(filter?.where),
        organizationId: this.organizationId
      }
    }
    return this.priceListRepository.find(filter);
  }

  @intercept(validatePriceListExists)
  @get('/price-lists/{id}')
  @response(200, {
    description: 'PriceList model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(PriceList, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(PriceList, {exclude: 'where'}) filter?: FilterExcludingWhere<PriceList>
  ): Promise<PriceList> {
    return this.priceListRepository.findById(id, filter);
  }

  @intercept(validatePriceListExists)
  @patch('/price-lists/{id}')
  @response(204, {
    description: 'PriceList PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PriceList, {partial: true, exclude: ['id', 'organizationId']}),
        },
      },
    })
    priceList: Omit<PriceList, 'id,organizationId'>,
  ): Promise<void> {

    const repo = new DefaultTransactionalRepository(PriceList, this.priceListRepository.dataSource);
    const tx = await repo.beginTransaction();

    const res = await this.priceListRepository.updateById(id, priceList, {transaction: tx});

    if (priceList.isDefault == true) {
      const data: DataObject<PriceList> = {isDefault: false}
      const where: Where<PriceList> = {organizationId: this.organizationId, id: {neq: id}};
      await this.priceListRepository.updateAll(data, where, {transaction: tx});
    }

    await tx.commit();
    return res;
  }

  @intercept(validatePriceListExists)
  @del('/price-lists/{id}')
  @response(204, {
    description: 'PriceList DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    const repo = new DefaultTransactionalRepository(PriceList, this.priceListRepository.dataSource);
    const tx = await repo.beginTransaction();

    const where: Where<PriceList> = {id: id, organizationId: this.organizationId};
    const exists = await this.priceListRepository.findOne({where: {...where, isDefault: true}});
    if (exists != null) {
      throw new HttpErrors[400]('No se puede eliminar la lista de precios por default.');
    }

    const pricesWhere: Where<PriceListPrice> = {priceListId: id, organizationId: this.organizationId};
    const prices = await this.priceListPriceRepository.find({where: {...pricesWhere}});
    await this.priceListPriceRepository.deleteAll(pricesWhere, {transaction: tx});
    for (let i = 0; i < prices.length; i++) {
      const product = await this.productRepository.findById(prices[i].productId);
      await this.productRepository.updateById(prices[i].productId, {prices: product.prices - 1}, {transaction: tx});
    }
    const res = await this.priceListRepository.deleteById(id, {transaction: tx});

    await tx.commit();
    return res;
  }

}
