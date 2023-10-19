import {authenticate} from '@loopback/authentication';
import {Interceptor, inject, intercept} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  Where,
  repository
} from '@loopback/repository';
import {
  HttpErrors,
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
import {BranchOffice} from '../models';
import {BranchOfficeRepository} from '../repositories';

// TODO: Create interceptor for unique branch office name validation in the same organization
const validateBranchOfficeExists: Interceptor = async (invocationCtx, next) => {
  const repo = await invocationCtx.get<BranchOfficeRepository>(BranchOfficeRepository.BindingKey);
  const orgId = await invocationCtx.get<number>('USER_ORGANIZATION_ID');
  const id: number = invocationCtx.args[0] || 0;

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

  const result = await next();
  return result;
};

@authenticate('jwt')
@intercept(
  AuthInterceptor.BINDING_KEY
)
export class BranchOfficeController {
  constructor(
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @repository(BranchOfficeRepository)
    public branchOfficeRepository: BranchOfficeRepository,
  ) { }

  @post('/branch-offices')
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
  ): Promise<BranchOffice[]> {
    return this.branchOfficeRepository.find({
      ...filter,
      where: {
        ...(filter != undefined && filter.where != undefined ? filter.where : {}),
        organizationId: this.organizationId
      }
    });
  }

  @patch('/branch-offices')
  @response(200, {
    description: 'BranchOffice PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(BranchOffice, {partial: true}),
        },
      },
    })
    branchOffice: BranchOffice,
    @param.where(BranchOffice) where?: Where<BranchOffice>,
  ): Promise<Count> {

    Object.assign(branchOffice, {organizationId: this.organizationId});
    return this.branchOfficeRepository.updateAll(branchOffice, where);
  }

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

  @intercept(validateBranchOfficeExists)
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

  @intercept(validateBranchOfficeExists)
  @put('/branch-offices/{id}')
  @response(204, {
    description: 'BranchOffice PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() branchOffice: BranchOffice,
  ): Promise<void> {
    Object.assign(branchOffice, {organizationId: this.organizationId});
    await this.branchOfficeRepository.replaceById(id, branchOffice);
  }

  @del('/branch-offices/{id}')
  @response(204, {
    description: 'BranchOffice DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.branchOfficeRepository.deleteById(id);
  }
}
