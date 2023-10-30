import {inject} from '@loopback/core';
import {DefaultCrudRepository, Filter, RepositoryBindings} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Organization, PriceList, PriceListRelations} from '../models';

export class PriceListRepository extends DefaultCrudRepository<
  PriceList,
  typeof PriceList.prototype.id,
  PriceListRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.PriceListRepository`;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(PriceList, dataSource);
  }

  public getOrganizationFilter = (org: Organization): Filter<PriceList> => {
    const filter: Filter<PriceList> = {
      where: {
        organizationId: org.id
      }
    };

    return filter;
  }

}
