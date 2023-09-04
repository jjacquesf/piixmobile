import {Entity, hasMany, model, property} from '@loopback/repository';
import {Product} from './product.model';

@model({
  settings: {idInjection: false, mysql: {table: 'organization'}}
})
export class Organization extends Entity {
  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 100,
    generated: 0,
    mysql: {columnName: 'address', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  address?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'business_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  businessName: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'commercial_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  commercialName: string;

  @property({
    type: 'date',
    required: false,
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 50,
    generated: 0,
    mysql: {columnName: 'email', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  email?: string;

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
    jsonSchema: {nullable: true},
    length: 20,
    generated: 0,
    mysql: {columnName: 'phone', dataType: 'varchar', dataLength: 20, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 20,
    generated: 0,
    mysql: {columnName: 'rfc', dataType: 'varchar', dataLength: 20, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  rfc?: string;

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

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 100,
    generated: 0,
    mysql: {columnName: 'website', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  website?: string;

  @hasMany(() => Product) products?: Product[];

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Organization>) {
    super(data);
  }
}

export interface OrganizationRelations {
  // describe navigational properties here

}

export type OrganizationWithRelations = Organization & OrganizationRelations;


@model({})
export class OrganizationPayload extends Entity {
  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 100,
    generated: 0,
    mysql: {columnName: 'address', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  address?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'business_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  businessName: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 100,
    generated: 0,
    mysql: {columnName: 'commercial_name', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  commercialName: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 50,
    generated: 0,
    mysql: {columnName: 'email', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  email?: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 20,
    generated: 0,
    mysql: {columnName: 'phone', dataType: 'varchar', dataLength: 20, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: true},
    length: 20,
    generated: 0,
    mysql: {columnName: 'rfc', dataType: 'varchar', dataLength: 20, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  rfc?: string;

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
    type: 'string',
    jsonSchema: {nullable: true, pattern: '\\d{3}-\\d{3}-\\d{4}', },
    length: 100,
    generated: 0,
    mysql: {columnName: 'website', dataType: 'varchar', dataLength: 100, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0}
  })
  website?: string;
}
