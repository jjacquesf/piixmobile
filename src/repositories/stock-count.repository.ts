import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {StockCount, StockCountRelations} from '../models';

export class StockCountRepository extends DefaultCrudRepository<
  StockCount,
  typeof StockCount.prototype.id,
  StockCountRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.StockCountRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(StockCount, dataSource);
  }
}
