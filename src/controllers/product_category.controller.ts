import {inject} from '@loopback/core';
import {
  Filter,
  repository
} from '@loopback/repository';
import {Request, Response, RestBindings, del, get, getModelSchemaRef, param, patch, post, put, requestBody, response} from '@loopback/rest';
import {Organization, ProductCategory} from '../models';
import {OrganizationRepository, ProductCategoryRepository} from '../repositories';

// @authenticate('jwt')
export class ProductCategoryController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @repository(ProductCategoryRepository)
    public productCategoryRepository: ProductCategoryRepository,
  ) { }

  private getOrganizationFilter = (org: Organization): Filter<ProductCategory> => {
    const filter: Filter<ProductCategory> = {
      where: {
        organizationId: org.id
      }
    };

    return filter;
  }

  @get('/organizations/{organizationId}/catalog/categories')
  @response(200, {
    description: 'ProductCategory model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ProductCategory, {includeRelations: true}),
      },
    },
  })
  async find(
    @param.path.number('organizationId') organizationId: number
  ): Promise<ProductCategory[]> {
    const org = await this.organizationRepository.findById(organizationId);
    return this.productCategoryRepository.find({where: {organizationId: org.id}});
  }

  @get('/organizations/{organizationId}/catalog/categories/{id}')
  @response(200, {
    description: 'ProductCategory model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(ProductCategory, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
  ): Promise<ProductCategory> {
    const org = await this.organizationRepository.findById(organizationId);
    const orgFiter = this.getOrganizationFilter(org);

    return await this.productCategoryRepository.findById(id, orgFiter);
  }


  @post('/organizations/{organizationId}/catalog/categories')
  @response(201, {
    description: 'ProductCategory POST success',
  })
  async create(
    @param.path.number('organizationId') organizationId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ProductCategory, {partial: true}),
        },
      },
    })
    payload: ProductCategory,
  ): Promise<ProductCategory> {
    const org = await this.organizationRepository.findById(organizationId);

    let parentId = undefined;
    let level = 1;

    if (payload.parentId) {
      parentId = payload.parentId;
      const parent = await this.productCategoryRepository.findById(parentId, this.getOrganizationFilter(org));

      parentId = payload.parentId;
      level = parent.level + 1;
    }

    const model = {
      organizationId: org.id,
      name: payload.name,
      status: payload.status,
      level,
      parentId
    }

    this.response.status(201);
    return await this.productCategoryRepository.create(model);
  }

  @patch('/organizations/{organizationId}/catalog/categories/{id}')
  @response(201, {
    description: 'ProductCategory PATCH success',
  })
  async updateById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ProductCategory, {partial: true}),
        },
      },
    })
    payload: ProductCategory,
  ): Promise<ProductCategory> {
    const org = await this.organizationRepository.findById(organizationId);
    const orgFiter = this.getOrganizationFilter(org);
    const cat = await this.productCategoryRepository.findById(id, orgFiter);

    let parentId = cat.parentId;
    let level = cat.level;

    if (payload.parentId) {
      parentId = payload.parentId;
      const parent = await this.productCategoryRepository.findById(parentId, this.getOrganizationFilter(org));

      parentId = payload.parentId;
      level = parent.level + 1;
    }

    const model = new ProductCategory({
      organizationId: org.id,
      name: payload.name != undefined ? payload.name : cat.name,
      status: payload.status != undefined ? payload.status : cat.status,
      level,
      parentId
    });

    await this.productCategoryRepository.updateById(cat.id, model);

    this.response.status(201);
    return await this.productCategoryRepository.findById(id, orgFiter);
  }

  @put('/organizations/{organizationId}/catalog/categories/{id}')
  @response(201, {
    description: 'ProductCategory PUT success',
  })
  async replaceById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ProductCategory, {partial: true}),
        },
      },
    })
    payload: ProductCategory,
  ): Promise<ProductCategory> {
    const org = await this.organizationRepository.findById(organizationId);
    const orgFiter = this.getOrganizationFilter(org);
    const cat = await this.productCategoryRepository.findById(id, orgFiter);

    let parentId = cat.parentId;
    let level = cat.level;

    if (payload.parentId) {
      parentId = payload.parentId;
      const parent = await this.productCategoryRepository.findById(parentId, this.getOrganizationFilter(org));

      parentId = payload.parentId;
      level = parent.level + 1;
    }

    const model = new ProductCategory({
      id: cat.id,
      organizationId: org.id,
      name: payload.name != undefined ? payload.name : cat.name,
      status: payload.status != undefined ? payload.status : cat.status,
      level,
      parentId
    });

    await this.productCategoryRepository.replaceById(id, model);

    this.response.status(201);
    return await this.productCategoryRepository.findById(id, orgFiter);
  }

  @del('/organizations/{organizationId}/catalog/categories/{id}')
  @response(204, {
    description: 'ProductCategory DELETE success',
  })
  async deleteById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number
  ): Promise<void> {
    const org = await this.organizationRepository.findById(organizationId);
    const filter = this.getOrganizationFilter(org);

    const cat = await this.productCategoryRepository.findById(id, filter);
    await this.productCategoryRepository.deleteById(cat.id);
  }
}
