import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {AppEvent, AppEventRelations} from '../models';

export class AppEventRepository extends DefaultCrudRepository<
  AppEvent,
  typeof AppEvent.prototype.id,
  AppEventRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(AppEvent, dataSource);
  }
}
