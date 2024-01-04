import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, RepositoryBindings, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {BranchOffice, BranchOfficeRelations, Organization} from '../models';
import {IBranchOfficeWarehouseCount} from '../models/interfaces/branch-office.interface';
import {S3Service} from '../services/s3.service';
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

  public findByIdAndOwnerOrganization = (organizationId: number, id: number): Promise<BranchOffice | null> => {
    const filter: Filter<BranchOffice> = {
      where: {
        organizationId: organizationId,
        id: id
      }
    };

    return this.findOne(filter);
  }

  public countWarehouses = async (branchOffice: BranchOffice): Promise<number> => {
    const data: IBranchOfficeWarehouseCount[] = await this.execute(`SELECT
                                                                          warehouse.branch_office_id AS branchOfficeId,
                                                                            COUNT(*) as warehouses
                                                                        FROM
                                                                          warehouse
                                                                        WHERE
                                                                          warehouse.branch_office_id = ${branchOffice.id || 0}
                                                                        GROUP
                                                                          BY
                                                                              warehouse.branch_office_id`) as unknown as IBranchOfficeWarehouseCount[];
    if (data.length != 0) {
      return data[0].warehouses;
    }

    return 0;
  }

}
