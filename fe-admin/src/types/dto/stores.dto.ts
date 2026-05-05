import { Store } from '@/types/store';
import { PagedMetaDto } from './materials.dto';

export type StoreEntityDto = Store;

export interface StoresPagedResponseDto {
    items: StoreEntityDto[];
    meta: PagedMetaDto;
}

export interface CreateStoreRequestDto {
    nama_toko: string;
    no_hp: string;
    alamat: string;
}

export interface UpdateStoreRequestDto extends Partial<CreateStoreRequestDto> { }
