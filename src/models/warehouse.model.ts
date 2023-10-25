import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {idInjection: false, mysql: {table: 'warehouse'}}
})
export class Warehouse extends Entity {
  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  name: string;

  @property({
    type: 'date',
    required: false,
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created: string;

  @property({
    type: 'number',
    jsonSchema: {nullable: false},
    precision: 10,
    scale: 0,
    generated: 1,
    id: 1,
    mysql: {columnName: 'id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 1},
  })
  id?: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {nullable: false},
    precision: 10,
    scale: 0,
    generated: 1,
    id: 1,
    mysql: {columnName: 'organization_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  organizationId: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {nullable: false},
    precision: 10,
    scale: 0,
    generated: 1,
    id: 1,
    mysql: {columnName: 'branch_office_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  branchOfficeId: number;


  @property({
    type: 'number',
    required: true,
    jsonSchema: {nullable: false},
    precision: 3,
    scale: 0,
    generated: 0,
    mysql: {columnName: 'status', dataType: 'tinyint', dataLength: null, dataPrecision: 3, dataScale: 0, nullable: 'N', generated: 0},
  })
  status: number;

  @property({
    type: 'date',
    required: false,
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'updated', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  updated: string;

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Warehouse>) {
    super(data);
  }
}

export interface WarehouseRelations {
  // describe navigational properties here

}

export type WarehouseWithRelations = Warehouse & WarehouseRelations;
