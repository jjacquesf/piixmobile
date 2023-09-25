export interface IProductMedia {
  entityId: number;
  entityType: string;
  mediaType: number;
  order: number;
  path: string;
  url: string;
  id: number;
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
  files: IProductMedia[]
}
