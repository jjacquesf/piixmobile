import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {idInjection: false, mysql: {table: 'stock_count'}}
})
export class StockCount extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    mysql: {columnName: 'id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 1},
  })
  id?: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'organization_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  organizationId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'branch_office_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  branchOfficeId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'warehouse_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  warehouseId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'product_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  productId: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'stock', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  stock: number;

  @property({
    type: 'date',
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created?: string;

  @property({
    type: 'date',
    mysql: {columnName: 'updated', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  updated?: string;


  constructor(data?: Partial<StockCount>) {
    super(data);
  }
}

export interface StockCountRelations {
  // describe navigational properties here
}

export type StockCountWithRelations = StockCount & StockCountRelations;
