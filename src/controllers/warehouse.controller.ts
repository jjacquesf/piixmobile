import {authenticate} from '@loopback/authentication';
import {Binding, inject, intercept, Interceptor} from '@loopback/core';
import {
  Count,
  CountSchema,
  DataObject,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
  RestBindings,
} from '@loopback/rest';
import {AuthInterceptor} from '../interceptors';
import {Warehouse} from '../models';
import {BranchOfficeRepository, WarehouseRepository} from '../repositories';

// TODO: Create interceptor for unique warehouse name validation in the same branch office
const validateWarehouseExists: Interceptor = async (invocationCtx, next) => {
  const reqCtx = await invocationCtx.get(RestBindings.Http.CONTEXT);
  const repo = await invocationCtx.get<WarehouseRepository>(WarehouseRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const id: number = invocationCtx.args[0] || 0;

  const filter: Filter<Warehouse> = {
    where: {
      id,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('El almacen especificado no existe en la organización.');
  }

  const warehouseBinding = Binding
    .bind<Warehouse>(WarehouseController.WarehouseBindingKey)
    .to(model);

  reqCtx.add(warehouseBinding);

  const result = await next();
  return result;
};

const validateBranchOfficeExists: Interceptor = async (invocationCtx, next) => {
  const repo = await invocationCtx.get<BranchOfficeRepository>(BranchOfficeRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const data: DataObject<Warehouse> = invocationCtx.args[0] || {};

  const filter: Filter<Warehouse> = {
    where: {
      id: data.branchOfficeId || 0,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {
    throw new HttpErrors[422]('La sucursal especificada no existe en la organización.');
  }

  const result = await next();
  return result;
};

const validateWarehouseUniqueName: Interceptor = async (invocationCtx, next) => {
  const repo = await invocationCtx.get<WarehouseRepository>(WarehouseRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');

  let data: DataObject<Warehouse>;
  let id: number | undefined = undefined;

  if (invocationCtx.args.length == 2) {
    id = invocationCtx.args[0];
    data = invocationCtx.args[1] || {};
  } else {
    data = invocationCtx.args[0] || {};
  }

  const name = data?.name || '';
  if (name.length == 0) {
    throw new HttpErrors[422]('El nombre del almacen es obligatorio');
  }

  let filter: Filter<Warehouse> = {
    where: {
      ...(id != undefined ? {
        id: {
          neq: id
        }
      } : {}),
      name: {
        like: name.trim()
      },
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model != null) {
    throw new HttpErrors[422]('Ya existe un almacen con el mismo nombre en la sucursal destino.');
  }

  const result = await next();
  return result;
};

@authenticate('jwt')
@intercept(
  AuthInterceptor.BINDING_KEY
)
export class WarehouseController {
  public static WarehouseBindingKey = 'WarehouseController.WarehouseKey';

  constructor(
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(WarehouseRepository)
    public warehouseRepository: WarehouseRepository,
  ) { }

  @intercept(validateBranchOfficeExists)
  @intercept(validateWarehouseUniqueName)
  @post('/warehouses')
  @response(200, {
    description: 'Warehouse model instance',
    content: {'application/json': {schema: getModelSchemaRef(Warehouse)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Warehouse, {
            title: 'NewWarehouse',
            exclude: ['id', 'organizationId'],
          }),
        },
      },
    })
    warehouse: Omit<Warehouse, 'id,organizationId'>,
  ): Promise<Warehouse> {
    Object.assign(warehouse, {organizationId: this.organizationId});
    const model = await this.warehouseRepository.create(warehouse);
    return model;
  }

  @get('/warehouses/count')
  @response(200, {
    description: 'Warehouse model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Warehouse) where?: Where<Warehouse>,
  ): Promise<Count> {
    return this.warehouseRepository.count({
      ...(where != undefined ? where : {}),
      organizationId: this.organizationId
    });
  }

  @get('/warehouses')
  @response(200, {
    description: 'Array of Warehouse model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Warehouse, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Warehouse) filter?: Filter<Warehouse>,
  ): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      ...filter,
      where: {
        ...(filter != undefined && filter.where != undefined ? filter.where : {}),
        organizationId: this.organizationId
      }
    });
  }

  @intercept(validateWarehouseExists)
  @get('/warehouses/{id}')
  @response(200, {
    description: 'Warehouse model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Warehouse, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Warehouse, {exclude: 'where'}) filter?: FilterExcludingWhere<Warehouse>
  ): Promise<Warehouse> {
    return this.warehouseRepository.findById(id, filter);
  }

  @intercept(validateWarehouseExists)
  @intercept(validateWarehouseUniqueName)
  @patch('/warehouses/{id}')
  @response(204, {
    description: 'Warehouse PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Warehouse, {partial: true}),
        },
      },
    })
    warehouse: Warehouse,
  ): Promise<void> {
    Object.assign(warehouse, {organizationId: this.organizationId});
    await this.warehouseRepository.updateById(id, warehouse);
  }

  @intercept(validateWarehouseExists)
  @intercept(validateWarehouseUniqueName)
  @put('/warehouses/{id}')
  @response(204, {
    description: 'Warehouse PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() warehouse: Warehouse,
  ): Promise<void> {
    Object.assign(warehouse, {organizationId: this.organizationId});
    await this.warehouseRepository.replaceById(id, warehouse);
  }

  @intercept(validateWarehouseExists)
  @del('/warehouses/{id}')
  @response(204, {
    description: 'Warehouse DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.warehouseRepository.deleteById(id);
  }
}
