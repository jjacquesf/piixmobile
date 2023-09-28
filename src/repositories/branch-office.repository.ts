import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BranchOffice, BranchOfficeRelations, Organization} from '../models';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';

export class BranchOfficeRepository extends DefaultCrudRepository<
  BranchOffice,
  typeof BranchOffice.prototype.id,
  BranchOfficeRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository(MediaRepository) public mediaRepository: MediaRepository,
    @service(S3Service) private s3: S3Service
  ) {
    super(BranchOffice, dataSource);
  }

  public getOrganizationFilter = (org: Organization): Filter<BranchOffice> => {
    const filter: Filter<BranchOffice> = {
      where: {
        organizationId: org.id
      }
    };

    return filter;
  }

}
