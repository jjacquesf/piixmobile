import {authenticate} from '@loopback/authentication';
import {inject, intercept} from '@loopback/core';
import {Filter, WhereBuilder, property, repository} from '@loopback/repository';
import {
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {Product} from '../models';
import {IProduct} from '../models/interfaces';
import {ProductRepository} from '../repositories';
import {FeaturedProductRepository} from '../repositories/featured-product.repository';
import {validateBranchOfficeExists} from './branch-office.controller';


export class PosFilterProducts {
  @property({
    type: 'string',
    required: true,
  })
  query: string;

  @property({
    type: 'boolean'
  })
  featuredOnly?: boolean;
}

@authenticate('jwt')
export class PosController {
  constructor(
    @inject('USER_ORGANIZATION_ID')
    public organizationId: number,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(FeaturedProductRepository)
    public featuredProductRepository: FeaturedProductRepository,
  ) { }

  @intercept(validateBranchOfficeExists)
  @post('/pos/filter-products/{branchOfficeId}')
  @response(200, {
    description: 'IProduct model instance array',
  })
  async create(
    @param.path.number('branchOfficeId') branchOfficeId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PosFilterProducts, {
            title: 'PosFilterProducts'
          }),
        },
      },
    })
    filterData: PosFilterProducts,
  ): Promise<IProduct[]> {

    let ids: number[] = [];
    if (filterData.featuredOnly === true) {
      const featured = await this.featuredProductRepository.find({
        fields: ['productId'],
        where: {
          organizationId: this.organizationId,
          branchOfficeId: branchOfficeId,
        }
      });
      ids = featured.map(data => data.productId)
      if (ids.length == 0) {
        ids.push(-1);
      }
    }

    const whereBuilder = new WhereBuilder();
    const where = whereBuilder
      .and({
        organizationId: this.organizationId,
        prices: {gt: 0},
        ...(ids.length != 0 ? {id: {inq: ids}} : {})
      }, {
        or: [
          {internalName: {like: `%${filterData.query}%`}},
          {externalName: {like: `%${filterData.query}%`}},
        ]
      })
      .build();

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

}
