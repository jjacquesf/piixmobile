import {Entity, model, property} from '@loopback/repository';

export enum EntityType {
  Product = "Product"
}

@model({
  settings: {idInjection: false, mysql: {table: 'media'}}
})
export class Media extends Entity {

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
    required: true,
    jsonSchema: {nullable: false},
    length: 50,
    generated: 0,
    mysql: {columnName: 'entity_type', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  entityType: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'entity_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  entityId: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 50,
    generated: 0,
    mysql: {columnName: 'media_type', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  mediaType: string;

  @property({
    type: 'number',
    required: false,
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'order', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  order?: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 50,
    generated: 0,
    mysql: {columnName: 'path', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  path: string;

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Media>) {
    super(data);
  }
}

export interface MediaRelations {
  // describe navigational properties here

}

export type MediaWithRelations = Media & MediaRelations;
