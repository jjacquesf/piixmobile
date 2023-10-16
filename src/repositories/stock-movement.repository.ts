import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {StockMovement, StockMovementRelations} from '../models';

export class StockMovementRepository extends DefaultCrudRepository<
  StockMovement,
  typeof StockMovement.prototype.id,
  StockMovementRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(StockMovement, dataSource);
  }
}
