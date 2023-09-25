
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Request, Response, RestBindings, param, post, requestBody} from '@loopback/rest';
import Ajv, {JSONSchemaType} from 'ajv';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {ProductCategoryRepository, ProductRepository} from '../repositories';
import {FileUploadHandler, UploadedFiles} from '../types';

enum ColumnName {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  I = "I",
  J = "J",
  K = "K",
  L = "L",
  M = "M",
  N = "N",
  O = "O",
  P = "P",
  Q = "Q",
  R = "R",
  S = "S",
  T = "T",
  U = "U",
  V = "V",
  W = "W",
  X = "X",
  Y = "Y",
  Z = "Z",
}

interface IProductImportConfig {
  code: ColumnName;
  name: ColumnName;
  prices: ColumnName[];
  stock: ColumnName;
  minQty: ColumnName;
  category: ColumnName;
}

const columns = [
  ColumnName.A,
  ColumnName.B,
  ColumnName.C,
  ColumnName.D,
  ColumnName.E,
  ColumnName.F,
  ColumnName.G,
  ColumnName.H,
  ColumnName.I,
  ColumnName.J,
  ColumnName.K,
  ColumnName.L,
  ColumnName.M,
  ColumnName.N,
  ColumnName.O,
  ColumnName.P,
  ColumnName.Q,
  ColumnName.R,
  ColumnName.S,
  ColumnName.T,
  ColumnName.U,
  ColumnName.V,
  ColumnName.W,
  ColumnName.X,
  ColumnName.Y,
  ColumnName.Z,
];

const schemaProductImport: JSONSchemaType<IProductImportConfig> = {
  type: "object",
  properties: {
    code: {type: "string", enum: columns},
    name: {type: "string", enum: columns},
    prices: {
      type: "array",
      items: {type: "string", enum: columns}
    },
    stock: {type: "string", enum: columns},
    minQty: {type: "string", enum: columns},
    category: {type: "string", enum: columns}
  },
  required: [
    'code',
    'name',
    'prices',
    'stock',
    'minQty',
    'category'
  ],
  additionalProperties: false
}

@authenticate('jwt')
export class ProductImportController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @repository(ProductRepository) public productRepository: ProductRepository,
    @repository(ProductCategoryRepository) public productCategoryRepository: ProductCategoryRepository,
  ) { }

  @post('/organizations/{organizationId}/branch/{branchId}/catalog/products/import', {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
        description: 'Files and fields',
      },
    },
  })
  async fileUpload(
    @param.path.number('organizationId') organizationId: number,
    @param.path.number('branchId') branchId: number,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    return new Promise<object>((resolve, reject) => {
      this.handler(request, response, async (err: unknown) => {
        if (err) reject(err);
        else {
          try {

            const config = {
              code: ColumnName.A,
              name: ColumnName.B,
              prices: [ColumnName.C, ColumnName.D, ColumnName.E],
              stock: ColumnName.F,
              minQty: ColumnName.G,
              category: ColumnName.H,
              branch: ColumnName.I,
            } as IProductImportConfig;

            const ajv = new Ajv();
            const isValid = ajv.compile(schemaProductImport);

            if (!isValid(config)) {return response.status(400).send('Invalid import config');}

            const uploadedFiles: UploadedFiles = request.files || [];
            if (Array.isArray(uploadedFiles)) {
              for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
              }
            }

            resolve({
              success: true,
              config
            });
          } catch (err) {
            // return response.status(400).send(err.message);
            reject(err);
          }
        }
      });
    });
  }

}
