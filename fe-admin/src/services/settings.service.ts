import { apiGetData, apiPutData } from './api';
import { OrderPolicyDto } from '@/types/dto/settings.dto';

type UpdateOrderPolicyPayload = Omit<OrderPolicyDto, 'updated_date'>;

export const settingsService = {
  getOrderPolicy: () => apiGetData<OrderPolicyDto>('/settings/order-policy'),
  getOrderPolicyPublic: () => apiGetData<OrderPolicyDto>('/settings/order-policy/public'),
  updateOrderPolicy: (payload: UpdateOrderPolicyPayload) => apiPutData<OrderPolicyDto, UpdateOrderPolicyPayload>('/settings/order-policy', payload),
};
