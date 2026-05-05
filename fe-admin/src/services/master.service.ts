import { apiDeleteOk, apiGetData, apiPostData, apiPutData } from './api';
import { Banner, Eyelet, Material } from '@/types/material';
import {
  BannerEntityDto,
  CreateBannerRequestDto,
  CreateEyeletRequestDto,
  CreateMaterialRequestDto,
  EyeletEntityDto,
  MaterialNeedsReactivateDto,
  MaterialEntityDto,
  MaterialsPagedResponseDto,
  UpdateBannerRequestDto,
  UpdateEyeletRequestDto,
  UpdateMaterialRequestDto,
} from '@/types/dto/materials.dto';

export const bahanService = {
  getPaged: (params: { page: number; limit: number; search?: string }) =>
    apiGetData<MaterialsPagedResponseDto>(`/materials?page=${params.page}&limit=${params.limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`),

  async getAll(params?: { search?: string }) {
    const paged = await apiGetData<MaterialsPagedResponseDto>(`/materials?page=1&limit=1000${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`);
    return paged.items;
  },

  getById: (id: string) => apiGetData<MaterialEntityDto>(`/materials/${id}`),
  create: (payload: Omit<Material, '_id' | 'created_at'>) =>
    apiPostData<MaterialEntityDto | MaterialNeedsReactivateDto, CreateMaterialRequestDto>('/materials', payload),
  update: (id: string, payload: Partial<Material>) => apiPutData<MaterialEntityDto, UpdateMaterialRequestDto>(`/materials/${id}`, payload),
  delete: (id: string) => apiDeleteOk(`/materials/${id}`),
  restore: (id: string) => apiPostData<MaterialEntityDto>(`/materials/${id}/restore`),
};

export const mataAyamService = {
  getPaged: (params: { page: number; limit: number; search?: string }) =>
    apiGetData<EyeletsPagedResponseDto>(
      `/eyelets?page=${params.page}&limit=${params.limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
    ),

  async getAll() {
    const paged = await apiGetData<EyeletsPagedResponseDto>('/eyelets?page=1&limit=1000');
    return paged.items;
  },
  getById: (id: string) => apiGetData<EyeletEntityDto>(`/eyelets/${id}`),
  create: (payload: Omit<Eyelet, '_id' | 'created_at'>) => apiPostData<EyeletEntityDto | { needs_reactivate: true; eyelet_id: string; message: string }, CreateEyeletRequestDto>('/eyelets', payload),
  update: (id: string, payload: Partial<Eyelet>) => apiPutData<EyeletEntityDto, UpdateEyeletRequestDto>(`/eyelets/${id}`, payload),
  delete: (id: string) => apiDeleteOk(`/eyelets/${id}`),
  restore: (id: string) => apiPostData<EyeletEntityDto>(`/eyelets/${id}/restore`),
};

export const bannerService = {
  getPaged: (params: { page: number; limit: number; search?: string }) =>
    apiGetData<BannersPagedResponseDto>(
      `/banners?page=${params.page}&limit=${params.limit}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
    ),
  getAll: () => apiGetData<BannerEntityDto[]>('/banners'),
  getById: (id: string) => apiGetData<BannerEntityDto>(`/banners/${id}`),
  create: (payload: CreateBannerRequestDto) => {
    const fd = new FormData();
    fd.append('material_id', payload.material_id);
    fd.append('title', payload.title);
    if (payload.image) fd.append('image', payload.image);
    return apiPostData<BannerEntityDto, FormData>('/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id: string, payload: UpdateBannerRequestDto) => {
    const fd = new FormData();
    if (payload.material_id) fd.append('material_id', payload.material_id);
    if (payload.title) fd.append('title', payload.title);
    if (payload.image) fd.append('image', payload.image);
    return apiPutData<BannerEntityDto, FormData>(`/banners/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id: string) => apiDeleteOk(`/banners/${id}`),
};
