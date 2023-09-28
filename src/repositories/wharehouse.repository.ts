import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BranchOffice, Organization, Warehouse, WarehouseRelations} from '../models';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';

export class WarehouseRepository extends DefaultCrudRepository<
  Warehouse,
  typeof Warehouse.prototype.id,
  WarehouseRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository(MediaRepository) public mediaRepository: MediaRepository,
    @service(S3Service) private s3: S3Service
  ) {
    super(Warehouse, dataSource);
  }

  public getOrganizationFilter = (model: Organization): Filter<Warehouse> => {
    const filter: Filter<Warehouse> = {
      where: {
        organizationId: model.id
      }
    };

    return filter;
  }

  public getBranchOfficeByNameFilter = (model: BranchOffice, name: string): Filter<Warehouse> => {
    const filter: Filter<Warehouse> = {
      where: {
        organizationId: model.organizationId,
        branchOfficeId: model.id,
        name: {
          like: name
        }
      }
    };

    return filter;
  }



}
