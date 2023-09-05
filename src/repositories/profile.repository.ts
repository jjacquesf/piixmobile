import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Profile, ProfileRelations} from '../models/profile.model';
import {OrganizationRepository} from './organization.repository';

export class ProfileRepository extends DefaultCrudRepository<
  Profile,
  typeof Profile.prototype.id,
  ProfileRelations
> {

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('OrganizationRepository') protected organizationRepositoryGetter: Getter<OrganizationRepository>,
  ) {
    super(Profile, dataSource);
  }
}
