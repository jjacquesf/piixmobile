export interface IProductMedia {
  entityId: number;
  entityType: string;
  mediaType: number;
  order: number;
  path: string;
  id: number;
}

export interface IProductWarehouseStock {
  branchOfficeId: number;
  warehouseId: number;
  branchOfficeName: string;
  warehouseName: string;
  stock: number;
}

export interface IProductPrice {
  priceListId: number;
  name: string;
  price: number;
}

export interface IProduct {
  id: number;
  brand: string;
  color: string | null;
  externalName: string;
  internalName: string;
  model: string;
  organizationId: number;
  productCategoryId: number;
  sku: string;
  status: number;
  updated: string | null;
  files: IProductMedia[];
  stock: IProductWarehouseStock[],
  prices: IProductPrice[],
}
