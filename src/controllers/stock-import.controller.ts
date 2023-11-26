
import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Request, RequestContext, Response, RestBindings, post, requestBody} from '@loopback/rest';
import Ajv, {JSONSchemaType} from 'ajv';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {BranchOffice, StockMovementType, Warehouse} from '../models';
import {BranchOfficeRepository, OrganizationRepository, ProductRepository, StockMovementRepository, WarehouseRepository} from '../repositories';
import {ExcelService} from '../services';
import {ColumnName, FileUploadHandler, UploadedFiles} from '../types';

export enum StockMovementTypeSpanish {
  IN = 'ENTRADA',
  OUT = 'SALIDA',
  SET = 'AJUSTE'
};

interface IStockImportConfig {
  sku: ColumnName;
  type: ColumnName;
  branchOffice: ColumnName;
  warehouse: ColumnName;
  qty: ColumnName;
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

const schemaStockImport: JSONSchemaType<IStockImportConfig> = {
  type: "object",
  properties: {
    sku: {type: "string", enum: columns},
    type: {type: "string", enum: columns},
    branchOffice: {type: "string", enum: columns},
    warehouse: {type: "string", enum: columns},
    qty: {type: "string", enum: columns},
  },
  required: [
    'sku',
    'type',
    'branchOffice',
    'warehouse',
    'qty'
  ],
  additionalProperties: false
}

@authenticate('jwt')
@authorize({allowedRoles: ['ADMIN']})
export class StockImportController {
  constructor(
    @inject(RestBindings.Http.CONTEXT) private requestCtx: RequestContext,
    @inject('USER_ORGANIZATION_ID') public organizationId: number,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @repository(OrganizationRepository) public organizationRepository: OrganizationRepository,
    @repository(BranchOfficeRepository) public branchOfficeRepository: BranchOfficeRepository,
    @repository(ProductRepository) public productRepository: ProductRepository,
    @repository(WarehouseRepository) public warehouseRepository: WarehouseRepository,
    @repository(StockMovementRepository) public stockMovementRepository: StockMovementRepository,

    @service(ExcelService) public excelService: ExcelService
  ) { }

  @post('/stock-movement/import', {
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
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {

    return new Promise<object>((resolve, reject) => {
      this.handler(request, response, async (err: unknown) => {
        if (err) reject(err);
        else {
          try {

            const profileId = await this.requestCtx.get<number>('USER_PROFILE_ID');
            const org = await this.organizationRepository.findById(this.organizationId);

            const config = {
              sku: ColumnName.A,
              branchOffice: ColumnName.B,
              warehouse: ColumnName.C,
              type: ColumnName.D,
              qty: ColumnName.E,
            } as IStockImportConfig;

            const ajv = new Ajv();
            const isValid = ajv.compile(schemaStockImport);

            if (!isValid(config)) {return response.status(400).send('Invalid import config');}

            const uploadedFiles: UploadedFiles = request.files || [];
            const branchOffices: Record<string, BranchOffice> = {};
            const warehouses: Record<string, Warehouse> = {};

            if (Array.isArray(uploadedFiles)) {
              for (let i = 0; i < uploadedFiles.length; i++) {

                const file = uploadedFiles[i];
                const rows: Record<string, any>[] = await this.excelService.sheetToJSON(file.buffer);

                if (rows.length < 2) {
                  reject(new Error('No data to import'));
                }

                const header = rows.splice(0, 1);

                const result: Record<string, Record<string, any>[]> = {
                  'updated': [],
                  'created': [],
                  'ignored': [],
                };

                for (let i = 0; i < rows.length; i++) {

                  const sku: string = rows[i][config.sku];
                  const type: string = rows[i][config.type];
                  const branchOfficeName: string | undefined = rows[i][config.branchOffice];
                  const warehouseName: string | undefined = rows[i][config.warehouse];
                  const qty: number = rows[i][config.qty];

                  if (sku != undefined &&
                    type != undefined &&
                    branchOfficeName != undefined &&
                    warehouseName != undefined &&
                    qty != undefined) {

                    let branchOffice;
                    if (branchOffices[branchOfficeName] != undefined) {
                      branchOffice = branchOffices[branchOfficeName];
                    } else {
                      const tmp = await this.branchOfficeRepository.findByName(branchOfficeName, org);
                      if (tmp != null) {
                        branchOffices[branchOfficeName] = tmp;
                        branchOffice = tmp;
                      }
                    }

                    if (branchOffice != undefined) {
                      let warehouse;
                      if (warehouses[warehouseName] != undefined) {
                        warehouse = warehouses[warehouseName];
                      } else {
                        const tmp = await this.warehouseRepository.findByName(warehouseName, org, branchOffice);
                        if (tmp != null) {
                          warehouses[warehouseName] = tmp;
                          warehouse = tmp;
                        }
                      }

                      if (warehouse != undefined) {
                        const product = await this.productRepository.findBySku(sku, org);
                        if (product != null) {
                          const mtype: StockMovementType | undefined =
                            type == StockMovementTypeSpanish.IN
                              ? StockMovementType.IN
                              : type == StockMovementTypeSpanish.OUT
                                ? StockMovementType.OUT
                                : type == StockMovementTypeSpanish.SET
                                  ? StockMovementType.SET
                                  : undefined;

                          if (mtype != undefined) {

                            const registered = await this.stockMovementRepository.register(
                              profileId,
                              warehouse,
                              product,
                              mtype,
                              qty
                            );

                            if (registered) {
                              result['created'].push(rows[i]);
                            } else {
                              result['ignored'].push(rows[i]);
                            }
                          } else {
                            result['ignored'].push(rows[i]);
                          }
                        } else {
                          result['ignored'].push(rows[i]);
                        }
                      } else {
                        result['ignored'].push(rows[i]);
                      }
                    } else {
                      result['ignored'].push(rows[i]);
                    }
                  } else {
                    result['ignored'].push(rows[i]);
                  }
                }

                resolve(result);
                break;
              }
            }
          } catch (err) {
            // return response.status(400).send(err.message);
            reject(err);
          }
        }
      });
    });
  }

}
