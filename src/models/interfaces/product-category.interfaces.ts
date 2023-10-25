export interface IProductCategory {
  id: number;
  name: string;
  created: string;
  updated: string;
  level: number;
  organizationId: number;
  parentId: number;
  status: number;
  children: IProductCategory[]
}

