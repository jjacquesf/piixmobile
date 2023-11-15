import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {Filter, WhereBuilder, repository} from '@loopback/repository';
import {
  get,
  param,
  response
} from '@loopback/rest';
import {Product} from '../models';
import {IProduct} from '../models/interfaces';
import {ProductRepository} from '../repositories';
import {FeaturedProductRepository} from '../repositories/featured-product.repository';

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

  @get('/pos/filter-products')
  @response(200, {
    description: 'IProduct model instance array',
  })
  async create(
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

}
