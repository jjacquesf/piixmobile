import {Model, model, property} from '@loopback/repository';
import {DiscountType, PaymentMethod} from './types/sale.types';

@model()
export class SaleItem extends Model {
  @property({
    type: 'number',
    required: true,
  })
  productId: number;

  @property({
    type: 'number',
    required: true,
  })
  productName: string;

  @property({
    type: 'number',
    required: true,
  })
  branchOfficeId: number;

  @property({
    type: 'number',
    required: true,
  })
  warehouseId: number;

  @property({
    type: 'number',
    required: true,
  })
  qty: number;

  @property({
    type: 'number',
    required: true,
  })
  priceListId: number;

  @property({
    type: 'number',
    required: true,
  })
  price: number;

  @property({
    type: 'boolean',
    required: true,
  })
  isCommon: boolean;

  constructor(data?: Partial<SaleDetails>) {
    super(data);
  }
}

@model()
export class SaleDiscount extends Model {
  @property({
    type: 'string',
    required: true,
  })
  type: DiscountType;

  @property({
    type: 'number',
    required: true,
  })
  amount: number;

  constructor(data?: Partial<SaleDetails>) {
    super(data);
  }
}

@model()
export class SalePayment extends Model {
  @property({
    type: 'string',
    required: true,
  })
  method: PaymentMethod;

  @property({
    type: 'number',
    required: true,
  })
  amount: number;

  constructor(data?: Partial<SaleDetails>) {
    super(data);
  }
}

@model()
export class SaleDetails extends Model {
  @property({
    type: 'number',
    required: true,
  })
  posSessionId: number;

  @property({
    type: 'number',
    required: true,
  })
  sellerId: number;

  @property({
    type: 'number',
    required: true,
  })
  branchOfficeId: number;

  @property({
    type: 'number',
    required: true,
  })
  warehouseId: number;

  @property({
    type: 'array',
    itemType: 'object',
    required: true,
  })
  items: SaleItem[];

  @property({
    type: 'object',
    // required: true,
  })
  discount?: SaleDiscount;

  @property({
    type: 'number',
    required: true,
  })
  shipping: number;

  @property({
    type: 'array',
    itemType: 'object',
    required: true,
  })
  payments: SalePayment[];


  constructor(data?: Partial<SaleDetails>) {
    super(data);
  }
}

export interface SaleDetailsRelations {
  // describe navigational properties here
}

export type SaleDetailsWithRelations = SaleDetails & SaleDetailsRelations;
