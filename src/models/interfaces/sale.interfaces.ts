import {DiscountType, PaymentMethod} from '../types';

export interface ISaleItem {
  productId: number;
  branchOfficeId: number;
  warehouseId: number;
  qty: number;
  priceListId: number;
}

export interface ISaleDiscount {
  type: DiscountType;
  amount: number;
}

export interface ISalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface ISale {
  branchOfficeId: number;
  warehouseId: number;
  items: ISaleItem[];
  discount: ISaleDiscount | null;
  shipping: number;
  payments: ISalePayment[];
}
