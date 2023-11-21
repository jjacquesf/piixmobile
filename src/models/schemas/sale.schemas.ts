import {JSONSchemaType} from 'ajv'
import {ISale, ISaleDiscount, ISaleItem, ISalePayment} from '../interfaces'

export const schemaSalePayment: JSONSchemaType<ISalePayment> = {
  type: "object",
  properties: {
    method: {type: "string", enum: ['card', 'cash', 'spei']},
    amount: {type: "number"},
  },
  required: [
    'method',
    'amount',
  ]
}

export const schemaSaleDiscount: JSONSchemaType<ISaleDiscount> = {
  type: "object",
  nullable: true,
  properties: {
    type: {type: "string", enum: ['fixed', 'percent']},
    amount: {type: "number"},
  },
  required: [
    'type',
    'amount',
  ]
}

export const schemaSaleItem: JSONSchemaType<ISaleItem> = {
  type: "object",
  properties: {
    productId: {type: "number"},
    branchOfficeId: {type: "number"},
    warehouseId: {type: "number"},
    qty: {type: "number"},
    priceListId: {type: "number"},
  },
  required: [
    'productId',
    'branchOfficeId',
    'warehouseId',
    'qty',
    'priceListId',
  ]
}

export const schemaSaleDetails: JSONSchemaType<ISale> = {
  type: "object",
  properties: {
    branchOfficeId: {type: "number"},
    warehouseId: {type: "number"},
    items: {
      type: "array",
      items: schemaSaleItem
    },
    discount: schemaSaleDiscount,
    shipping: {type: "number"},
    payments: {
      type: "array",
      items: schemaSalePayment
    },
  },
  required: [
    'branchOfficeId',
    'warehouseId',
    'items',
    // 'discount',
    'shipping',
    'payments'
  ],
  additionalProperties: false
}
