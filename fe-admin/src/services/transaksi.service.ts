import { apiGetData, apiPostData, apiPutData } from './api';
import { Order, OrderStatus, PaymentStatus } from '@/types/order';
import { CreateOrderRequestDto, OrderEntityDto, UpdateOrderStatusRequestDto } from '@/types/dto/orders.dto';

export const transaksiService = {
  async getPaged(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatus | 'all';
    payment_status?: PaymentStatus | 'all';
    date?: string;
    date_start?: string;
    date_end?: string;
  }) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.status && params.status !== 'all') q.set('status', params.status);
    if (params.payment_status && params.payment_status !== 'all') q.set('payment_status', params.payment_status);
    if (params.date) q.set('date', params.date);
    if (params.date_start) q.set('date_start', params.date_start);
    if (params.date_end) q.set('date_end', params.date_end);
    const url = `/orders?${q.toString()}`;
    return apiGetData<{ items: OrderEntityDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(url);
  },
  getById: (id: string) => apiGetData<OrderEntityDto>(`/orders/${id}`),
  create: (payload: CreateOrderRequestDto, files?: { proofFile?: File; designFiles?: File[] }) => {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === 'items' && Array.isArray(v)) {
        fd.append('items', JSON.stringify(v));
        return;
      }
      fd.append(k, String(v));
    });
    files?.designFiles?.forEach((file) => fd.append('design_files', file));
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
  getFollowUpMessage: (id: string) =>
    apiGetData<{ order_id: string; message: string }>(`/orders/${id}/follow-up-message`),
  delete: async () => ({ success: false }),
};
