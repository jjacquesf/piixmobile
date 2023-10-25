import {inject} from '@loopback/core';
import {DefaultCrudRepository, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Organization, OrganizationRelations} from '../models';

export class OrganizationRepository extends DefaultCrudRepository<
  Organization,
  typeof Organization.prototype.id,
  OrganizationRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.OrganizationRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Organization, dataSource);
  }
}
