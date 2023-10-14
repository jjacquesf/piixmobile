import {inject, intercept, Interceptor} from '@loopback/core';
import {
  Count,
  CountSchema,
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
} from '@loopback/rest';
import {AuthInterceptor} from '../interceptors';
import {Warehouse} from '../models';
import {WarehouseRepository} from '../repositories';

const validateWarehouseExists: Interceptor = async (invocationCtx, next) => {
  const repo: Warehouse = await invocationCtx.get(WarehouseRepository.BindingKey);
  const orgId: number = await invocationCtx.get('USER_ORGANIZATION_ID');
  const id: number = invocationCtx.args[0] || 0;

  const filter: Filter<Warehouse> = {
    where: {
      id,
      organizationId: orgId
    }
  };

  const model = await repo.findOne(filter);
  if (model == null) {throw HttpErrors[404]}

  const result = await next();
  return result;
};

@intercept(
  AuthInterceptor.BINDING_KEY
)
export class WarehouseController {
  constructor(
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(WarehouseRepository)
    public warehouseRepository: WarehouseRepository,
  ) { }

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
            exclude: ['id'],
          }),
        },
      },
    })
    warehouse: Omit<Warehouse, 'id'>,
  ): Promise<Warehouse> {
    Object.assign(warehouse, {organizationId: this.organizationId});
    return this.warehouseRepository.create(warehouse);
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

  @patch('/warehouses')
  @response(200, {
    description: 'Warehouse PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Warehouse, {partial: true}),
        },
      },
    })
    warehouse: Warehouse,
    @param.where(Warehouse) where?: Where<Warehouse>,
  ): Promise<Count> {
    return this.warehouseRepository.updateAll(warehouse, where);
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
