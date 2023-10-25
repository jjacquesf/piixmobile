import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, RepositoryBindings, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BranchOffice, BranchOfficeRelations, Organization} from '../models';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';

export class BranchOfficeRepository extends DefaultCrudRepository<
  BranchOffice,
  typeof BranchOffice.prototype.id,
  BranchOfficeRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.BranchOfficeRepository`;
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

  public findByName = (name: string, org: Organization): Promise<BranchOffice | null> => {
    const filter: Filter<BranchOffice> = {
      where: {
        organizationId: org.id,
        businessName: {
          like: name.trim()
        }
      }
    };

    return this.findOne(filter);
  }

}
