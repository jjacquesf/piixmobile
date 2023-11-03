import {authenticate} from '@loopback/authentication';
import {inject, intercept} from '@loopback/core';
import {property, repository} from '@loopback/repository';
import {
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {IProduct} from '../models/interfaces';
import {ProductRepository} from '../repositories';
import {validateBranchOfficeExists} from './branch-office.controller';


export class PosFilterProducts {
  @property({
    type: 'string',
    required: true,
  })
  name: string;
}

@authenticate('jwt')
export class PosController {
  constructor(
    @inject('USER_ORGANIZATION_ID')
    public organizationId: number,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
  ) { }

  @intercept(validateBranchOfficeExists)
  @post('/filter-products/{branchOfficeId}')
  @response(200, {
    description: 'IProduct model instance array',
  })
  async create(
    @param.path.number('organizationId') branchOfficeId: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PosFilterProducts, {
            title: 'PosFilterProducts'
          }),
        },
      },
    })
    filter: PosFilterProducts,
  ): Promise<IProduct[]> {
    return Promise.resolve([]);
  }

}
