import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Binding, Interceptor, InvocationContext, Next, inject, intercept} from '@loopback/core';
import {
  Count,
  CountSchema,
  DataObject,
  Filter,
  FilterExcludingWhere,
  Where,
  repository
} from '@loopback/repository';
import {
  HttpErrors,
  RestBindings,
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response
} from '@loopback/rest';
import {AuthInterceptor} from '../interceptors';
import {BranchOffice, FeaturedProduct, Product} from '../models';
import {IBranchOffice} from '../models/interfaces/branch-office.interface';
import {BranchOfficeRepository, PosSessionRepository, ProductRepository, WarehouseRepository} from '../repositories';
import {FeaturedProductRepository} from '../repositories/featured-product.repository';

const _validateBranchOfficeExists = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const repo = await invocationCtx.get<BranchOfficeRepository>(BranchOfficeRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');

  const filter: Filter<BranchOffice> = {
    where: {
      id,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('La sucursal especificada no existe en la organización.');
  }

  // const result = await next();
  // return result;
};

const _validateProductExists = async (invocationCtx: InvocationContext, next: Next, id: number) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<ProductRepository>(ProductRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');

  const filter: Filter<BranchOffice> = {
    where: {
      id,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('El producto especificado no existe en la organización.');
  }

  const binding = Binding
    .bind<Product>(BranchOfficeController.ProductBindingKey)
    .to(model);
  reqCtx.add(binding);
};

export const validateBranchOfficeExists: Interceptor = async (invocationCtx, next) => {
  const id: number = invocationCtx.args[0] || 0;
  _validateBranchOfficeExists(invocationCtx, next, id);

  const result = await next();
  return result;
};

const validateNoWarehouses: Interceptor = async (invocationCtx, next) => {
  const repo = await invocationCtx.get<WarehouseRepository>(WarehouseRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const id: number = invocationCtx.args[0] || 0;

  const filter: Where<BranchOffice> = {
    organizationId: orgId,
    branchOfficeId: id
  };

  const count = await repo.count(filter);
  if (count.count != 0) {
    throw new HttpErrors[422]('La sucursal no se puede elminar porque tiene almaces asignados.');
  }

  const result = await next();
  return result;
};

const validatBranchOfficeUniqueName: Interceptor = async (invocationCtx, next) => {
  const repo = await invocationCtx.get<BranchOfficeRepository>(BranchOfficeRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');

  let data: DataObject<BranchOffice>;
  let id: number | undefined = undefined;

  if (invocationCtx.args.length == 2) {
    id = invocationCtx.args[0];
    data = invocationCtx.args[1] || {};
  } else {
    data = invocationCtx.args[0] || {};
  }

  const businessName = data?.businessName || '';
  if (businessName.length == 0) {
    throw new HttpErrors[422]('La razón social es obligatoria');
  }

  let filter: Filter<BranchOffice> = {
    where: {
      ...(id != undefined ? {
        id: {
          neq: id
        }
      } : {}),
      businessName: {
        like: businessName.trim()
      },
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model != null) {
    throw new HttpErrors[422]('Ya existe una sucursal con la misma razón social.');
  }

  const result = await next();
  return result;
};

const validateProductExists: Interceptor = async (invocationCtx, next) => {
  const id: number = invocationCtx.args[1] || 0;
  _validateProductExists(invocationCtx, next, id);

  const result = await next();
  return result;
};


@authenticate('jwt')
@intercept(
  AuthInterceptor.BINDING_KEY
)
export class BranchOfficeController {
  public static BranchOfficeBindingKey = 'BranchOfficeController.BranchOfficeKey';
  public static ProductBindingKey = 'ProductController.ProductKey';

  constructor(
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(BranchOfficeRepository)
    public branchOfficeRepository: BranchOfficeRepository,
    @repository(FeaturedProductRepository)
    public featuredProductRepository: FeaturedProductRepository,
    @repository(WarehouseRepository) public warehouseRepository: WarehouseRepository,
    @repository(PosSessionRepository) public posSessionRepository: PosSessionRepository,
  ) { }

  @post('/branch-offices')
  @authorize({allowedRoles: ['ADMIN']})
  @intercept(validatBranchOfficeUniqueName)
  @response(200, {
    description: 'BranchOffice model instance',
    content: {'application/json': {schema: getModelSchemaRef(BranchOffice)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(BranchOffice, {
            title: 'NewBranchOffice',
            exclude: ['id', 'organizationId'],
          }),
        },
      },
    })
    branchOffice: Omit<BranchOffice, 'id,organizationId'>,
  ): Promise<BranchOffice> {
    Object.assign(branchOffice, {organizationId: this.organizationId});
    return this.branchOfficeRepository.create(branchOffice);
  }

  @get('/branch-offices/count')
  @authorize({allowedRoles: ['ADMIN']})
  @response(200, {
    description: 'BranchOffice model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(BranchOffice) where?: Where<BranchOffice>,
  ): Promise<Count> {
    return this.branchOfficeRepository.count({
      ...where,
      organizationId: this.organizationId
    });
  }

  @get('/branch-offices')
  @response(200, {
    description: 'Array of BranchOffice model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(BranchOffice, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(BranchOffice) filter?: Filter<BranchOffice>,
  ): Promise<IBranchOffice[]> {
    const rows = await this.branchOfficeRepository.find({
      ...filter,
      where: {
        ...(filter != undefined && filter.where != undefined ? filter.where : {}),
        organizationId: this.organizationId
      }
    });

    const data: IBranchOffice[] = [];

    for (let i = 0; i < rows.length; i++) {
      data.push({
        ...rows[i].toJSON(),
        warehouses: await this.branchOfficeRepository.countWarehouses(rows[i])
      } as unknown as IBranchOffice)
    }

    return data;
  }

  @authorize({allowedRoles: ['ADMIN']})
  @intercept(validateBranchOfficeExists)
  @get('/branch-offices/{id}')
  @response(200, {
    description: 'BranchOffice model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(BranchOffice, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(BranchOffice, {exclude: 'where'}) filter?: FilterExcludingWhere<BranchOffice>
  ): Promise<BranchOffice> {
    return this.branchOfficeRepository.findById(id, filter);

  }

  @authorize({allowedRoles: ['ADMIN']})
  @intercept(validateBranchOfficeExists)
  @intercept(validatBranchOfficeUniqueName)
  @patch('/branch-offices/{id}')
  @response(204, {
    description: 'BranchOffice PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(BranchOffice, {partial: true}),
        },
      },
    })
    branchOffice: BranchOffice,
  ): Promise<void> {
    Object.assign(branchOffice, {organizationId: this.organizationId});
    await this.branchOfficeRepository.updateById(id, branchOffice);
  }

  @authorize({allowedRoles: ['ADMIN']})
  @intercept(validateBranchOfficeExists)
  @intercept(validatBranchOfficeUniqueName)
  @put('/branch-offices/{id}')
  @response(204, {
    description: 'BranchOffice PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(BranchOffice, {partial: true}),
        },
      },
    }) branchOffice: BranchOffice,
  ): Promise<void> {
    Object.assign(branchOffice, {organizationId: this.organizationId});
    await this.branchOfficeRepository.updateById(id, branchOffice);
  }

  @authorize({allowedRoles: ['ADMIN']})
  @intercept(validateNoWarehouses)
  @del('/branch-offices/{id}')
  @response(204, {
    description: 'BranchOffice DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    const warehouses = await this.warehouseRepository.count({branchOfficeId: id});
    if (warehouses.count > 0) {
      throw new HttpErrors[400]('No se puede eliminar la sucursal porque tiene almacenes dependientes');
    }

    const sessions = await this.posSessionRepository.count({branchOfficeId: id});
    if (sessions.count > 0) {
      throw new HttpErrors[400]('No se puede eliminar la sucursal porque tiene ventas registradas');
    }

    await this.branchOfficeRepository.deleteById(id);
  }

  @authorize({allowedRoles: ['ADMIN', 'SELLER']})
  @intercept(validateBranchOfficeExists)
  @intercept(validateProductExists)
  @post('/branch-offices/featured-product/{id}/{productId}')
  @response(200, {
    description: 'FeaturedProduct',
    content: {'application/json': {schema: FeaturedProduct}},
  })
  async createFeaturedProduct(
    @param.path.number('id') id: number,
    @param.path.number('productId') productId: number
  ): Promise<FeaturedProduct> {
    const data = {
      organizationId: this.organizationId,
      branchOfficeId: id,
      productId: productId,
    }
    const where: Where<FeaturedProduct> = data;
    const featured = await this.featuredProductRepository.findOne({where: where});
    if (featured) {
      throw new HttpErrors[400]('El producto ya es destacado en la sucursal.');
    }

    return await this.featuredProductRepository.create(data);
  }

  @authorize({allowedRoles: ['ADMIN', 'SELLER']})
  @intercept(validateBranchOfficeExists)
  @intercept(validateProductExists)
  @del('/branch-offices/featured-product/{id}/{productId}')
  @response(200, {
    description: 'FeaturedProduct DELETE success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async deleteFeaturedProduct(
    @param.path.number('id') id: number,
    @param.path.number('productId') productId: number
  ): Promise<Count> {
    const where: Where<FeaturedProduct> = {
      organizationId: this.organizationId,
      branchOfficeId: id,
      productId: productId,
    }
    return await this.featuredProductRepository.deleteAll(where);
  }
}
