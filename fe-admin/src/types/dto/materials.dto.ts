import { Banner, Eyelet, Material } from '@/types/material';

export type MaterialEntityDto = Material;
export type EyeletEntityDto = Eyelet;
export type BannerEntityDto = Banner;

export interface PagedMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MaterialsPagedResponseDto {
  items: MaterialEntityDto[];
  meta: PagedMetaDto;
}

export interface EyeletsPagedResponseDto {
  items: EyeletEntityDto[];
  meta: PagedMetaDto;
}

export interface BannersPagedResponseDto {
  items: BannerEntityDto[];
  meta: PagedMetaDto;
}

export interface CreateMaterialRequestDto {
  code: string;
  name: string;
  description?: string;
  price_per_meter: number;
  is_active: boolean;
}

export interface UpdateMaterialRequestDto extends Partial<CreateMaterialRequestDto> {}

export interface MaterialNeedsReactivateDto {
  needs_reactivate: true;
  material_id: string;
  message: string;
}

export interface CreateEyeletRequestDto {
  name: string;
}

export interface UpdateEyeletRequestDto {
  name?: string;
}

export interface CreateBannerRequestDto {
  material_id: string;
  title: string;
  image?: File;
}

export interface UpdateBannerRequestDto {
  material_id?: string;
  title?: string;
  image?: File;
}
