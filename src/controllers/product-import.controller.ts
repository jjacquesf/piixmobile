
import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Request, Response, RestBindings, param, post, requestBody} from '@loopback/rest';
import Ajv, {JSONSchemaType} from 'ajv';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {Product, ProductCategory} from '../models';
import {BranchOfficeRepository, OrganizationRepository, ProductCategoryRepository, ProductRepository} from '../repositories';
import {ExcelService} from '../services';
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
  sku: ColumnName;
  category: ColumnName;
  model: ColumnName;
  internalName: ColumnName;
  externalName: ColumnName;
  brand: ColumnName;
  color: ColumnName;
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
    sku: {type: "string", enum: columns},
    category: {type: "string", enum: columns},
    model: {type: "string", enum: columns},
    internalName: {type: "string", enum: columns},
    externalName: {type: "string", enum: columns},
    brand: {type: "string", enum: columns},
    color: {type: "string", enum: columns}
  },
  required: [
    'sku',
    'category',
    'model',
    'internalName',
    'externalName',
    'brand',
    'color',
  ],
  additionalProperties: false
}

@authenticate('jwt')
export class ProductImportController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @repository(OrganizationRepository) public organizationRepository: OrganizationRepository,
    @repository(BranchOfficeRepository) public branchOfficeRepository: BranchOfficeRepository,
    @repository(ProductRepository) public productRepository: ProductRepository,
    @repository(ProductCategoryRepository) public productCategoryRepository: ProductCategoryRepository,
    @service(ExcelService) public excelService: ExcelService
  ) { }

  @post('/organizations/{organizationId}/catalog/products/import', {
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
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {

    return new Promise<object>((resolve, reject) => {
      this.handler(request, response, async (err: unknown) => {
        if (err) reject(err);
        else {
          try {

            const org = await this.organizationRepository.findById(organizationId);

            const config = {
              sku: ColumnName.A,
              category: ColumnName.B,
              model: ColumnName.C,
              internalName: ColumnName.D,
              externalName: ColumnName.E,
              brand: ColumnName.F,
              color: ColumnName.G,
            } as IProductImportConfig;

            const ajv = new Ajv();
            const isValid = ajv.compile(schemaProductImport);

            if (!isValid(config)) {return response.status(400).send('Invalid import config');}

            const uploadedFiles: UploadedFiles = request.files || [];
            let categories: Record<string, ProductCategory> = {};
            if (Array.isArray(uploadedFiles)) {
              for (let i = 0; i < uploadedFiles.length; i++) {

                const file = uploadedFiles[i];
                const rows: Record<string, any>[] = await this.excelService.sheetToJSON(file.buffer);

                if (rows.length < 2) {
                  reject(new Error('No data to import'));
                }

                const header = rows.splice(0, 1);

                const defaultCat = await this.productCategoryRepository.findFirst(org);

                const result: Record<string, Record<string, any>[]> = {
                  'updated': [],
                  'created': [],
                  'ignored': [],
                };

                for (let i = 0; i < rows.length; i++) {

                  const sku: string = rows[i][config.sku];
                  const categoryName: string = rows[i][config.category];
                  const model: string | undefined = rows[i][config.model];
                  const internalName: string = rows[i][config.internalName];
                  const externalName: string = rows[i][config.externalName];
                  const brand: string | undefined = rows[i][config.brand];
                  const color: string | undefined = rows[i][config.color];

                  if (sku != undefined
                    && internalName != undefined
                    && externalName != undefined
                    && defaultCat != null) {

                    let cat = defaultCat;
                    if (categories[categoryName] != undefined) {
                      cat = categories[categoryName];
                    } else {
                      const tmp = await this.productCategoryRepository.findByName(categoryName, org);
                      if (tmp != null) {
                        categories[categoryName] = tmp;
                      }
                    }

                    let data: Record<string, any> = {
                      sku,
                      model,
                      internalName,
                      externalName,
                      productCategoryId: cat?.id,
                      brand,
                      color,
                      organizationId: org.id
                    };

                    const exist = await this.productRepository.findBySku(sku, org);

                    // Update product if exists
                    if (exist != null) {
                      await this.productRepository.updateById(exist.id, data);
                      result['updated'].push(data);
                      continue;
                    }

                    // Create if don't
                    data = {
                      ...data,
                      status: 1
                    };
                    const partial = new Product(data);
                    await this.productRepository.create(partial);
                    result['created'].push(data);
                  } else {
                    result['ignored'].push(rows[i]);
                  }
                }

                resolve(result);
                break;
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
