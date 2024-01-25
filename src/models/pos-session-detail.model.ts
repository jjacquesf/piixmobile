import {Model, model, property} from '@loopback/repository';
import {PosSession} from './pos-session.model';
import {Sale} from './sale.model';

@model()
export class PosSessionDetail extends Model {
  @property({
    type: 'object',
    required: true,
  })
  session: PosSession;

  @property({
    type: 'array',
    itemType: 'object',
    required: true,
  })
  sales: Sale[];


  constructor(data?: Partial<PosSessionDetail>) {
    super(data);
  }
}

export interface PosSessionDetailRelations {
  // describe navigational properties here
}

export type PosSessionDetailWithRelations = PosSessionDetail & PosSessionDetailRelations;
