export interface IProfile {
  id: number;
  userId: string;
  organizationId: number;
  firstName: string;
  lastName: string;
  stateId: number;
  cityId: number;
  avatar: string;
  phone: string;
  created: string;
  updated: string;
  status: number;
  roles: string[];
}
