import {inject} from '@loopback/core';
import {DefaultCrudRepository, Filter} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Organization, ProductCategory, ProductCategoryRelations} from '../models';
import {IProductCategory} from '../models/interfaces/product-category.interfaces';

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


  public toJSON = async (model: ProductCategory): Promise<IProductCategory> => {

    const children = await this.find({
      order: ['name ASC'],
      where: {
        organizationId: model.organizationId,
        parentId: model.id
      }
    })

    const aaa = {
      ...model.toJSON(),
      children: children.map(child => child.toJSON()) as IProductCategory[]
    } as IProductCategory;

    return aaa;
  }
}
