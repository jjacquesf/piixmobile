import {AppEventType} from '../types/app-event.types';
import {IProduct} from './product.interfaces';

export interface IAppEvent {
  id?: number;
  organizationId: number;
  profileId: number;
  type: AppEventType;
  branchOfficeId?: number;
  posSessionId?: number;
  product?: IProduct
  comments?: string;
  created?: string;
  updated?: string;
}
