import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, RepositoryBindings, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Media, Organization, Product, ProductRelations} from '../models';
import {IProduct, IProductMedia, IProductPrice, IProductWarehouseStock} from '../models/interfaces';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';
import {OrganizationRepository} from './organization.repository';
import {PriceListPriceRepository} from './price-list-price.repository';
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
    @repository(PriceListPriceRepository) public priceListPriceRepository: PriceListPriceRepository,
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
        } as IProductMedia
      )
    }

    return files;
  }

  public getProductStock = async (product: Product): Promise<IProductWarehouseStock[]> => {
    const count: IProductWarehouseStock[] = await this.warehouseRepository.execute(`SELECT
                                                                                        warehouse.name, SUM(stock) AS stock
                                                                                    FROM
                                                                                        stock_count LEFT JOIN warehouse ON stock_count.warehouse_id = warehouse.id
                                                                                    WHERE
                                                                                        stock_count.organization_id = ${product.organizationId}
                                                                                        and product_id = ${product.id}
                                                                                    GROUP
                                                                                        BY warehouse.name`) as unknown as IProductWarehouseStock[];
    return count;
  }


  public getProductPrice = async (product: Product): Promise<IProductPrice[]> => {
    const data: IProductPrice[] = await this.priceListPriceRepository.execute(`SELECT
                                                                                      price_list.id AS priceListId,
                                                                                      price_list.name,
                                                                                      price_list_price.price
                                                                                    FROM
                                                                                        price_list_price LEFT JOIN price_list ON price_list_price.price_list_id = price_list.id
                                                                                    WHERE
                                                                                        price_list_price.organization_id = ${product.organizationId}
                                                                                        and product_id = ${product.id}`) as unknown as IProductPrice[];
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

  public toJSON = async (model: Product, fullMedia: boolean = true): Promise<IProduct> => {
    return {
      ...model.toJSON(),
      files: await this.getProductMedia(model, fullMedia ? undefined : 1),
      stock: await this.getProductStock(model),
      prices: await this.getProductPrice(model)
    } as IProduct
  }


}
