import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {PriceListPrice, PriceListPriceRelations} from '../models';

export class PriceListPriceRepository extends DefaultCrudRepository<
  PriceListPrice,
  typeof PriceListPrice.prototype.id,
  PriceListPriceRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.PriceListPriceRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(PriceListPrice, dataSource);
  }
}
