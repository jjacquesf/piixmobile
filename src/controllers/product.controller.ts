import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {
  Entity,
  Filter,
  Where,
  model,
  property,
  repository
} from '@loopback/repository';
import {Request, Response, RestBindings, del, get, getModelSchemaRef, param, patch, post, put, requestBody, response} from '@loopback/rest';
import {Media, Organization, Product} from '../models';
import {MediaRepository, OrganizationRepository, ProductCategoryRepository, ProductRepository} from '../repositories';
import {S3Service} from '../services';

interface IProductMedia {
  entityId: number;
  entityType: string;
  mediaType: number;
  order: number;
  path: string;
  url: string;
  id: number;
}

@model()
export class Sort extends Entity {
  @property({
    type: 'array',
    itemType: 'number',
    required: true,
  })
  ids: number[];
}

@authenticate('jwt')
export class ProductController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(ProductCategoryRepository)
    public productCategoryRepository: ProductCategoryRepository,
    @repository(MediaRepository)
    public mediaRepository: MediaRepository,
    @service(S3Service) private s3: S3Service
  ) { }

  private getOrganizationFilter = (org: Organization): Filter<Product> => {
    const filter: Filter<Product> = {
      where: {
        organizationId: org.id
      }
    };

    return filter;
  }

  private getMediaFilter = (product: Product, limit: number | undefined = undefined): Filter<Media> => {
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

  private getProductMedia = async (product: Product, limit: number | undefined = undefined): Promise<IProductMedia[]> => {
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

  @get('/organizations/{organizationId}/catalog/products')
  @response(200, {
    description: 'Product model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product, {includeRelations: true}),
      },
    },
  })
  async find(
    @param.path.number('organizationId') organizationId: number
  ): Promise<any[]> {
    const org = await this.organizationRepository.findById(organizationId);
    const models = await this.productRepository.find({where: {organizationId: org.id}});
    const data: any[] = [];
    for (let i = 0; i < models.length; i++) {
      data.push({
        ...models[i].toJSON(),
        files: await this.getProductMedia(models[i], 1)
      })
    }

    return data;
  }

  @get('/organizations/{organizationId}/catalog/products/{id}')
  @response(200, {
    description: 'Product model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Product, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
  ): Promise<any> {
    const org = await this.organizationRepository.findById(organizationId);
    const orgFiter = this.getOrganizationFilter(org);


    const model = await this.productRepository.findById(id, orgFiter);

    return {
      ...model.toJSON(),
      files: await this.getProductMedia(model)
    };
  }

  @post('/organizations/{organizationId}/catalog/products')
  @response(201, {
    description: 'Product POST success',
  })
  async create(
    @param.path.number('organizationId') organizationId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {partial: true}),
        },
      },
    })
    payload: Product,
  ): Promise<Product> {
    const org = await this.organizationRepository.findById(organizationId);

    const orgFiter = this.getOrganizationFilter(org);
    const cat = await this.productCategoryRepository.findById(payload.productCategoryId, orgFiter);

    const model = {
      organizationId: org.id,
      productCategoryId: cat.id,
      status: payload.status,
      externalName: payload.externalName,
      internalName: payload.internalName,
      sku: payload.sku,
      model: payload.model,
      brand: payload.brand,
      color: payload.color,
    }

    this.response.status(201);
    return await this.productRepository.create(model);
  }

  @patch('/organizations/{organizationId}/catalog/products/{id}')
  @response(201, {
    description: 'Product PATCH success',
  })
  async updateById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {partial: true}),
        },
      },
    })
    payload: Product,
  ): Promise<Product> {
    const org = await this.organizationRepository.findById(organizationId);

    const orgFiter = this.getOrganizationFilter(org);
    const prod = await this.productRepository.findById(id, orgFiter);

    let productCategoryId = prod.productCategoryId;
    if (payload.productCategoryId) {
      const cat = await this.productCategoryRepository.findById(payload.productCategoryId, orgFiter);
      if (cat.id != null) {
        productCategoryId = cat.id;
      }
    }

    const model = {
      organizationId: org.id,
      productCategoryId: productCategoryId,
      internalName: payload.internalName != undefined ? payload.internalName : prod.internalName,
      externalName: payload.externalName != undefined ? payload.externalName : prod.externalName,
      status: payload.status != undefined ? payload.status : prod.status,
      sku: payload.sku != undefined ? payload.sku : prod.sku,
      model: payload.model != undefined ? payload.model : prod.model,
      brand: payload.brand != undefined ? payload.brand : prod.brand,
      color: payload.color != undefined ? payload.color : prod.color,
    }

    await this.productRepository.updateById(prod.id, model);

    this.response.status(201);
    return await this.productRepository.findById(id, orgFiter);
  }

  @put('/organizations/{organizationId}/catalog/products/{id}')
  @response(201, {
    description: 'Product PUT success',
  })
  async replaceById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {partial: true}),
        },
      },
    })
    payload: Product,
  ): Promise<Product> {
    const org = await this.organizationRepository.findById(organizationId);

    const orgFiter = this.getOrganizationFilter(org);
    const prod = await this.productRepository.findById(id, orgFiter);

    const cat = await this.productCategoryRepository.findById(payload.productCategoryId, orgFiter);

    const model = {
      id: prod.id,
      organizationId: org.id,
      productCategoryId: cat.id,
      status: payload.status,
      externalName: payload.externalName,
      internalName: payload.internalName,
      sku: payload.sku,
      model: payload.model,
      brand: payload.brand,
      color: payload.color,
    }

    await this.productRepository.replaceById(prod.id, model);

    this.response.status(201);
    return await this.productRepository.findById(prod.id, orgFiter);
  }

  @patch('/organizations/{organizationId}/catalog/products/{id}/media')
  @response(204, {
    description: 'Sort product media',
  })
  async sortMedia(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Sort, {partial: false}),
        },
      },
    }) sort: Sort
  ): Promise<number> {
    const org = await this.organizationRepository.findById(organizationId);
    const filter = this.getOrganizationFilter(org);
    const prod = await this.productRepository.findById(id, filter);
    const mediaFilter = this.getMediaFilter(prod);
    let count = 0;
    for (let i = 0; i < sort.ids.length; i++) {
      const where: Where<Media> = {
        ...mediaFilter.where,
        id: sort.ids[i]
      };

      const updated = await this.mediaRepository.updateAll({order: i}, where)
      count += updated.count;
    }

    return count;
  }

  @del('/organizations/{organizationId}/catalog/products/{id}')
  @response(204, {
    description: 'Product DELETE success',
  })
  async deleteById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number
  ): Promise<void> {
    const org = await this.organizationRepository.findById(organizationId);
    const filter = this.getOrganizationFilter(org);

    const prod = await this.productRepository.findById(id, filter);
    await this.productRepository.deleteById(prod.id);
  }
}