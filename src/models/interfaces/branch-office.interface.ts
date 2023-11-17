export interface IBranchOffice {
  "address": string;
  "businessName": string;
  "cityId": number;
  "commercialName": string;
  "created": string;
  "email": string;
  "id": number;
  "organizationId": number;
  "phone": string;
  "rfc": string;
  "stateId": number;
  "status": number;
  "updated": string;
  "website": string;
  "warehouses": number;
}

export interface IBranchOfficeWarehouseCount {
  branchOfficeId: number;
  warehouses: number;
}
