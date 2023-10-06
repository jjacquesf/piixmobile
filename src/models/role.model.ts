import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {idInjection: false, mysql: {table: 'role'}}
})
export class Role extends Entity {
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
    length: 256,
    generated: 0,
    mysql: {columnName: 'name', dataType: 'varchar', dataLength: 50, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  name: string;

  @property({
    type: 'string',
    jsonSchema: {nullable: false},
    length: 50,
    generated: 0,
    mysql: {columnName: 'description', dataType: 'varchar', dataLength: 254, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  description?: string;

  @property({
    type: 'date',
    jsonSchema: {nullable: false},
    generated: 0,
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created: string;

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

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Role>) {
    super(data);
  }
}

export interface RoleRelations {
  // describe navigational properties here

}

export type RoleWithRelations = Role & RoleRelations;
