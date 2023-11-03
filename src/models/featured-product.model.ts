import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {idInjection: false, mysql: {table: 'featured_product'}}
})
export class FeaturedProduct extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
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
    mysql: {columnName: 'product_id', dataType: 'int', dataLength: null, dataPrecision: 10, dataScale: 0, nullable: 'N', generated: 0},
  })
  productId: number;


  constructor(data?: Partial<FeaturedProduct>) {
    super(data);
  }
}

export interface FeaturedProductRelations {
  // describe navigational properties here
}

export type FeaturedProductWithRelations = FeaturedProduct & FeaturedProductRelations;
