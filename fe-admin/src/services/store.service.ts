import { apiGetData, apiPostData, apiPutData } from './api';
import {
    CreateStoreRequestDto,
    StoreEntityDto,
    StoresPagedResponseDto,
    UpdateStoreRequestDto,
} from '@/types/dto/stores.dto';

export const storeService = {
    getPaged: (params: { page: number; limit: number; search?: string }) =>
        apiGetData<StoresPagedResponseDto>(`/stores?page=${params.page}&limit=${params.limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`),

    getAll: async () => {
        const paged = await apiGetData<StoresPagedResponseDto>('/stores?page=1&limit=1000');
        return paged.items;
    },

    getReportHeader: async () => {
        const paged = await apiGetData<StoresPagedResponseDto>('/stores?page=1&limit=1');
        return paged.items?.[0] ?? null;
    },

    create: (payload: CreateStoreRequestDto) =>
        apiPostData<StoreEntityDto, CreateStoreRequestDto>('/stores', payload),

    update: (id: string, payload: UpdateStoreRequestDto) =>
        apiPutData<StoreEntityDto, UpdateStoreRequestDto>(`/stores/${id}`, payload),
};
