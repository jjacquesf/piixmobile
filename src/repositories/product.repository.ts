import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, RepositoryBindings, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Media, Organization, Product, ProductRelations, Warehouse} from '../models';
import {IProduct, IProductMedia, IProductWarehouseStock} from '../models/interfaces';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';
import {OrganizationRepository} from './organization.repository';
import {WarehouseRepository} from './warehouse.repository';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
> {
  public static BindingKey = `${RepositoryBindings.REPOSITORIES}.ProductRepository`;
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository(OrganizationRepository) public organizationRepository: OrganizationRepository,
    @repository(WarehouseRepository) public warehouseRepository: WarehouseRepository,
    @repository(MediaRepository) public mediaRepository: MediaRepository,
    @service(S3Service) private s3: S3Service
  ) {
    super(Product, dataSource);
  }

  public getOrganizationFilter = (org: Organization): Filter<Product> => {
    const filter: Filter<Product> = {
      where: {
        organizationId: org.id
      }
    };

    return filter;
  }

  public getMediaFilter = (product: Product, limit: number | undefined = undefined): Filter<Media> => {
    const filter: Filter<Media> = {
      limit: limit,
      order: ['order ASC'],
      where: {
        entityId: product.id,
        entityType: 'Product'
      }
    };

    return filter;
  }

  public getProductMedia = async (product: Product, limit: number | undefined = undefined): Promise<IProductMedia[]> => {
    const filter: Filter<Media> = this.getMediaFilter(product, limit);
    const mediaFiles = await this.mediaRepository.find(filter);

    const files: any = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      files.push(
        {
          ...mediaFiles[i].toJSON(),
          url: await this.s3.signedUrl(mediaFiles[i].path)
        } as IProductMedia
      )
    }

    return files;
  }

  public getProductStock = async (product: Product, warehouses: Warehouse[]): Promise<IProductWarehouseStock[]> => {
    let data: IProductWarehouseStock[] = [];
    for (let i = 0; i < warehouses.length; i++) {
      const id: number = warehouses[i]?.id || 0;
      const count = await this.warehouseRepository.execute(`SELECT warehouse_id, SUM(stock) AS stock FROM stock_count WHERE warehouse_id = ${id} and product_id = ${product.id} GROUP BY warehouse_id`);
      let stock = 0;
      if (count.length != 0) {
        stock = count[0]?.stock || 0;
      }

      data.push({
        id,
        name: warehouses[i].name,
        stock,
      });
    }

    return data;
  }


  public findBySku = (sku: string, org: Organization): Promise<Product | null> => {
    const filter: Filter<Product> = {
      where: {
        organizationId: org.id,
        sku: {
          eq: sku
        }
      }
    };

    return this.findOne(filter);
  }

  public toJSON = async (model: Product, warehouses: Warehouse[], fullMedia: boolean = true): Promise<IProduct> => {
    return {
      ...model.toJSON(),
      files: await this.getProductMedia(model, fullMedia ? undefined : 1),
      stock: await this.getProductStock(model, warehouses),
    } as IProduct
  }


}
