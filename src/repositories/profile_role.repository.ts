import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {ProfileRole, ProfileRoleRelations} from '../models';

export class ProfileRoleRepository extends DefaultCrudRepository<
  ProfileRole,
  typeof ProfileRole.prototype.id,
  ProfileRoleRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(ProfileRole, dataSource);
  }
}
