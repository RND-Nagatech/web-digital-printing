import { apiGetData, apiPostData, apiPutData } from './api';
import { Order, OrderStatus } from '@/types/order';
import { CreateOrderRequestDto, OrderEntityDto, UpdateOrderStatusRequestDto } from '@/types/dto/orders.dto';

export const transaksiService = {
  async getPaged(params: { page?: number; limit?: number; search?: string; status?: OrderStatus | 'all'; date?: string }) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.status && params.status !== 'all') q.set('status', params.status);
    if (params.date) q.set('date', params.date);
    const url = `/orders?${q.toString()}`;
    return apiGetData<{ items: OrderEntityDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(url);
  },
  getById: (id: string) => apiGetData<OrderEntityDto>(`/orders/${id}`),
  create: (payload: CreateOrderRequestDto, files?: { proofFile?: File }) => {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'items' && Array.isArray(v)) {
        fd.append('items', JSON.stringify(v));
        return;
      }
      fd.append(k, String(v));
    });
    if (files?.proofFile) fd.append('payment_proof', files.proofFile);
    return apiPostData<OrderEntityDto, FormData>('/orders', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateStatus: (id: string, status: OrderStatus) =>
    apiPutData<OrderEntityDto, UpdateOrderStatusRequestDto>(`/orders/${id}/status`, { status }),
  uploadPaymentProof: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('payment_proof', file);
    return apiPostData<OrderEntityDto, FormData>(`/orders/${id}/payment-proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  settleCashPayment: (id: string) =>
    apiPostData<OrderEntityDto, Record<string, never>>(`/orders/${id}/settle-cash`, {}),
  delete: async () => ({ success: false }),
};
