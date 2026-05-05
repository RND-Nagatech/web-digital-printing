import { apiGetData, apiPostData } from './api';
import { CashEntry } from '@/types/order';
import { CashEntityDto, CreateCashRequestDto } from '@/types/dto/cash.dto';

export const kasService = {
  async getAll(params?: { type?: 'PEMASUKAN' | 'PENGELUARAN' | 'ALL' }) {
    const res = await apiGetData<{ items: CashEntityDto[] }>(
      '/cash',
      { params: { page: 1, limit: 100, type: params?.type ?? 'ALL' } },
    );
    return res.items ?? [];
  },
  async getPaged(params?: { page?: number; limit?: number; search?: string; type?: 'PEMASUKAN' | 'PENGELUARAN' | 'ALL' }) {
    const res = await apiGetData<{ items: CashEntityDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
      '/cash',
      { params: { page: params?.page, limit: params?.limit, search: params?.search, type: params?.type } },
    );
    return res;
  },
  create: (payload: Omit<CashEntry, '_id' | 'created_date' | 'tanggal'>) =>
    apiPostData<CashEntityDto, CreateCashRequestDto>('/cash', payload),
};
