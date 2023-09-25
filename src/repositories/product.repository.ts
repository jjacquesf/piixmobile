import {inject, service} from '@loopback/core';
import {DefaultCrudRepository, Filter, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Media, Organization, Product, ProductRelations} from '../models';
import {IProduct, IProductMedia} from '../models/interfaces';
import {S3Service} from '../services';
import {MediaRepository} from './media.repository';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
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

  public toJSON = async (model: Product, fullMedia: boolean = true): Promise<IProduct> => {
    return {
      ...model.toJSON(),
      files: await this.getProductMedia(model, fullMedia ? undefined : 1)
    } as IProduct
  }


}
