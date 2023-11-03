import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {FeaturedProduct, FeaturedProductRelations} from '../models';

export class FeaturedProductRepository extends DefaultCrudRepository<
  FeaturedProduct,
  typeof FeaturedProduct.prototype.id,
  FeaturedProductRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.FeaturedProductRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(FeaturedProduct, dataSource);
  }
}
