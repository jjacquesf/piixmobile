import {Entity, model, property} from '@loopback/repository';
import {IProduct} from './interfaces';
import {IAppEvent} from './interfaces/app-event.interface';
import {Product} from './product.model';
import {AppEventType} from './types/app-event.types';

@model({
  settings: {idInjection: false, mysql: {table: 'app_event'}}
})
export class AppEvent extends Entity {
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
    type: 'string',
    required: true,
    jsonSchema: {nullable: false},
    length: 256,
    generated: 0,
    mysql: {columnName: 'profile_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  profileId: number;

  @property({
    type: 'string',
    required: true,
  })
  type: AppEventType;

  @property({
    type: 'number',
    mysql: {columnName: 'branch_office_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'Y', generated: 0},
  })
  branchOfficeId?: number;

  @property({
    type: 'number',
    mysql: {columnName: 'pos_session_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'Y', generated: 0},
  })
  posSessionId?: number;

  @property({
    type: 'number',
    mysql: {columnName: 'product_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'Y', generated: 0},
  })
  productId?: number;

  @property({
    type: 'string',
    mysql: {columnName: 'comments', dataType: 'text', dataPrecision: null, dataScale: null, nullable: 'Y', generated: 0},
  })
  comments?: string;

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

  constructor(data?: Partial<AppEvent>) {
    super(data);
  }

  public static expand(model: AppEvent, product: Product | null): IAppEvent {
    return {
      id: model.id,
      organizationId: model.organizationId,
      profileId: model.profileId,
      type: model.type,
      branchOfficeId: model.branchOfficeId,
      posSessionId: model.posSessionId,
      ...(product !== null ? {
        product: {
          ...product.toJSON(),
        } as IProduct
      } : {}),
      comments: model.comments,
      created: model.created,
      updated: model.updated,
    } as IAppEvent;
  }
}

export interface AppEventRelations {
  // describe navigational properties here
}

export type AppEventWithRelations = AppEvent & AppEventRelations;
