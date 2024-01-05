import {Entity, model, property} from '@loopback/repository';
import {PosSessionStatus, PosSessionStatusOptions} from './types/pos-session.types';

@model({
  settings: {idInjection: false, mysql: {table: 'pos_session'}}
})
export class PosSession extends Entity {
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
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 256,
    generated: 0,
    mysql: {columnName: 'seller_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  sellerId: number;

  @property({
    type: 'date',
    required: true,
    mysql: {columnName: 'created', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  created: string;

  @property({
    type: 'date',
    required: true,
    mysql: {columnName: 'updated', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  updated: string;

  @property({
    type: 'date',
    required: false,
    mysql: {columnName: 'closed', dataType: 'timestamp', dataLength: null, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
  })
  closed?: string;

  @property({
    type: 'string',
    required: true,
    mysql: {columnName: 'status', dataType: 'varchar', dataLength: 45, dataPrecision: null, dataScale: null, nullable: 'N', generated: 0},
    jsonSchema: {
      enum: PosSessionStatusOptions
    }
  })
  status: PosSessionStatus;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'total_qty', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
    jsonSchema: {
      type: "integer",
      minimum: 0
    }
  })
  total_qty: number;

  @property({
    type: 'number',
    required: true,
    mysql: {columnName: 'total_amount', dataType: 'float', dataLength: null, dataPrecision: 8, dataScale: 0, nullable: 'N', generated: 0},
    jsonSchema: {
      minimum: 0
    }
  })
  total_amount: number;

  @property({
    type: 'string',
    mysql: {columnName: 'comments', dataType: 'text', dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  comments?: string;


  constructor(data?: Partial<PosSession>) {
    super(data);
  }
}

export interface PosSessionRelations {
  // describe navigational properties here
}

export type PosSessionWithRelations = PosSession & PosSessionRelations;
