import {inject} from '@loopback/core';
import {DefaultCrudRepository, Filter} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Organization, ProductCategory, ProductCategoryRelations} from '../models';

export class ProductCategoryRepository extends DefaultCrudRepository<
  ProductCategory,
  typeof ProductCategory.prototype.id,
  ProductCategoryRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(ProductCategory, dataSource);
  }


  public findByName = (name: string, org: Organization): Promise<ProductCategory | null> => {
    const filter: Filter<ProductCategory> = {
      where: {
        organizationId: org.id,
        name: {
          like: name.trim()
        }
      }
    };

    return this.findOne(filter);
  }

  public findFirst = (org: Organization): Promise<ProductCategory | null> => {
    const filter: Filter<ProductCategory> = {
      order: ['id ASC'],
      where: {
        organizationId: org.id,
      }
    };

    return this.findOne(filter);
  }
}
