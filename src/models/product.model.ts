import {Entity, model, property} from '@loopback/repository';
@model({
  settings: {idInjection: false, mysql: {table: 'product'}}
})
export class Product extends Entity {

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
    type: 'string',
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'brand', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  brand?: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'color', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  color?: string;

  @property({
    type: 'date',
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'external_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  externalName: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'internal_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  internalName: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'model', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  model?: string;

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
    jsonSchema: {nullable: false},
    precision: 10,
    scale: 0,
    generated: 1,
    id: 1,
    mysql: {columnName: 'product_category_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  productCategoryId: number;

  @property({
    type: 'string',
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'sku', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  sku?: string;

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
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'updated', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  updated: string;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'prices', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  prices: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {nullable: false},
    precision: 3,
    scale: 0,
    generated: 0,
    mysql: {columnName: 'is_common', dataType: 'tinyint', dataLength: null, dataPrecision: 3, dataScale: 0, nullable: 'N', generated: 0},
  })
  isCommon: boolean;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Product>) {
    super(data);
  }
}

export interface ProductRelations {
  // describe navigational properties here
}

export type ProductWithRelations = Product & ProductRelations;
