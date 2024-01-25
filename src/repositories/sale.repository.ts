import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Sale, SaleRelations} from '../models';

export class SaleRepository extends DefaultCrudRepository<
  Sale,
  typeof Sale.prototype.id,
  SaleRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.SaleRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Sale, dataSource);
  }
}
