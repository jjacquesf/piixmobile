import {authenticate} from '@loopback/authentication';
import {Binding, Interceptor, InvocationContext, Next, inject, intercept} from '@loopback/core';
import {
  DefaultTransactionalRepository,
  Entity,
  Filter,
  Where,
  model,
  property,
  repository
} from '@loopback/repository';
import {HttpErrors, Request, RequestContext, Response, RestBindings, del, get, getModelSchemaRef, param, patch, post, put, requestBody, response} from '@loopback/rest';
import {EntityType, Media, Organization, Product, StockCount} from '../models';
import {IProduct} from '../models/interfaces';
import {MediaRepository, OrganizationRepository, ProductCategoryRepository, ProductRepository, StockCountRepository, StockMovementRepository, WarehouseRepository} from '../repositories';

const _validateOrganizationExists = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<OrganizationRepository>(OrganizationRepository.BindingKey);

  const model = await repo.findById(id);

  const binding = Binding
    .bind<Organization>(ProductController.OrganizationBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const _validateProductExists = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const org = await reqCtx.get<Organization>(ProductController.OrganizationBindingKey);
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  const orgFiter = repo.getOrganizationFilter(org);

  const model = await repo.findById(id, orgFiter);

  const binding = Binding
    .bind<Product>(ProductController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);

  const result = await next();
  return result;
};

const validateOrganizationExists: Interceptor = async (invocationCtx, next) => {
  const id: number = invocationCtx.args[0] || 0;
  return _validateOrganizationExists(invocationCtx, next, id);
};

const validateProductExists: Interceptor = async (invocationCtx, next) => {
  const id: number = invocationCtx.args[1] || 0;
  return _validateProductExists(invocationCtx, next, id)
};

const validateEmptyProductStock: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  let prod = await reqCtx.get<Product>(ProductController.ProductBindingKey);
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);

  let can_be_deleted = true;
  const count = await repo.execute(`SELECT product_id, SUM(stock) AS stock FROM stock_count WHERE product_id = ${prod.id} GROUP BY product_id`);
  if (count.length != 0 && count[0]?.stock > 0) {
    can_be_deleted = false;
  }

  if (!can_be_deleted) {
    throw HttpErrors[422]('El producto no puede ser eliminado porque tiene existencias registradas.');
  }

  const result = await next();
  return result;
};

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
  public static OrganizationBindingKey = 'ProductController.OrganizationKey';
  public static ProductBindingKey = 'ProductController.ProductKey';

  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
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
    @repository(StockCountRepository)
    public stockCountRepository: StockCountRepository,
    @repository(StockMovementRepository)
    public stockMovementRepository: StockMovementRepository,
    @repository(WarehouseRepository)
    public warehouseRepository: WarehouseRepository,

  ) { }


  @intercept(validateOrganizationExists)
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
    @param.path.number('organizationId') organizationId: number,
    @param.filter(Product) filter?: Filter<Product>
  ): Promise<IProduct[]> {
    const org = await this.requestCtx.get<Organization>(ProductController.OrganizationBindingKey);
    const models = await this.productRepository.find({
      ...filter,
      where: {
        ...(filter != undefined && filter.where != undefined ? filter.where : {}),
        organizationId: org.id
      }
    });

    const data: IProduct[] = [];
    for (let i = 0; i < models.length; i++) {
      data.push(await this.productRepository.toJSON(models[i]));
    }

    return data;
  }

  @intercept(validateOrganizationExists)
  @intercept(validateProductExists)
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
  ): Promise<IProduct> {
    const prod = await this.requestCtx.get<Product>(ProductController.ProductBindingKey);

    return await this.productRepository.toJSON(prod);
  }

  @intercept(validateOrganizationExists)
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
  ): Promise<IProduct> {
    const org = await this.requestCtx.get<Organization>(ProductController.OrganizationBindingKey);

    const orgFiter = this.productRepository.getOrganizationFilter(org);
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
    const prod = await this.productRepository.create(model);


    // const where: Where<Warehouse> = {organizationId: prod.organizationId};
    // const warehouses = await this.warehouseRepository.find(where);

    return await this.productRepository.toJSON(prod); //warehouses
  }

  @intercept(validateOrganizationExists)
  @intercept(validateProductExists)
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
  ): Promise<IProduct> {
    const org = await this.requestCtx.get<Organization>(ProductController.OrganizationBindingKey);
    let prod = await this.requestCtx.get<Product>(ProductController.ProductBindingKey);

    const orgFiter = this.productRepository.getOrganizationFilter(org);

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
    prod = await this.productRepository.findById(id, orgFiter);

    return await this.productRepository.toJSON(prod, false);
  }

  @intercept(validateOrganizationExists)
  @intercept(validateProductExists)
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
  ): Promise<IProduct> {
    const org = await this.requestCtx.get<Organization>(ProductController.OrganizationBindingKey);
    let prod = await this.requestCtx.get<Product>(ProductController.ProductBindingKey);

    const orgFiter = this.productRepository.getOrganizationFilter(org);

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
    prod = await this.productRepository.findById(prod.id, orgFiter);

    return await this.productRepository.toJSON(prod);
  }

  @intercept(validateOrganizationExists)
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
    const org = await this.requestCtx.get<Organization>(ProductController.OrganizationBindingKey);
    let prod = await this.requestCtx.get<Product>(ProductController.ProductBindingKey);

    const mediaFilter = this.productRepository.getMediaFilter(prod);
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

  @intercept(validateOrganizationExists)
  @intercept(validateProductExists)
  @intercept(validateEmptyProductStock)
  @del('/organizations/{organizationId}/catalog/products/{id}')
  @response(204, {
    description: 'Product DELETE success',
  })
  async deleteById(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('id') id: number
  ): Promise<void> {
    let prod = await this.requestCtx.get<Product>(ProductController.ProductBindingKey);

    const repo = new DefaultTransactionalRepository(Product, this.productRepository.dataSource);
    const tx = await repo.beginTransaction();

    await this.productRepository.deleteById(prod.id, {transaction: tx});
    const mediaWhere: Where<Product> = {
      entityId: prod.id,
      entityType: EntityType.Product,
    }
    await this.mediaRepository.deleteAll(mediaWhere, {transaction: tx});

    const stockWhere: Where<StockCount> = {
      productId: prod.id
    }
    await this.stockCountRepository.deleteAll(stockWhere, {transaction: tx});
    await this.stockMovementRepository.deleteAll(stockWhere, {transaction: tx});

    await tx.commit();
  }
}
