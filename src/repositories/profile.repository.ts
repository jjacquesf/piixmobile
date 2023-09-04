import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Profile, ProfileRelations} from '../models/profile.model';

export class ProfileRepository extends DefaultCrudRepository<
  Profile,
  typeof Profile.prototype.id,
  ProfileRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Profile, dataSource);
  }
}
