import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Organization, OrganizationRelations} from '../models';

export class OrganizationRepository extends DefaultCrudRepository<
  Organization,
  typeof Organization.prototype.id,
  OrganizationRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Organization, dataSource);
  }
}
