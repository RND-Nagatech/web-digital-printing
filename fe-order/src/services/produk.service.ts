import { api } from './api';
import type { Material, MataAyamOption, SizePreset } from '@/types';

type ApiWrap<T> = { success: boolean; message: string; data: T };
type Paged<T> = { items: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const mapMaterial = (m: any): Material => ({
  id: m.code,          // kode_bahan used as id — matches what backend expects for kode_bahan field
  name: m.name,
  description: m.description ?? '',
  pricePerSqm: m.price_per_meter,
  imageUrl: m.image_url ?? '',
});

export const ProdukService = {
  async getMaterials(): Promise<Material[]> {
    const res = await api.get<ApiWrap<Paged<any>>>('/materials?page=1&limit=1000&is_active=true');
    // Backend returns paged response: { data: { items: [...], meta: {...} } }
    const items = res.data.data?.items ?? (Array.isArray(res.data.data) ? res.data.data : []);
    return items.filter((m: any) => m.is_active !== false).map(mapMaterial);
  },
  async getMaterialById(id: string): Promise<Material | undefined> {
    const list = await this.getMaterials();
    return list.find((m) => m.id === id);
  },
  async getMataAyamOptions(): Promise<MataAyamOption[]> {
    const res = await api.get<ApiWrap<Paged<any>>>('/eyelets?page=1&limit=1000');
    const items = res.data.data?.items ?? (Array.isArray(res.data.data) ? res.data.data : []);
    const options: MataAyamOption[] = [
      { id: 'none', label: 'Tanpa Mata Ayam', description: 'Tidak menggunakan mata ayam', extraPricePerSqm: 0 },
      ...items.map((x: any) => ({
        id: x._id,
        label: x.name,
        description: x.name,
        extraPricePerSqm: 0,
      })),
    ];
    return options;
  },
  async getSizePresets(): Promise<SizePreset[]> {
    const res = await api.get<ApiWrap<any[]>>('/sizes/public');
    const items = res.data.data ?? [];
    return items.map((row: any) => ({
      id: row._id,
      code: row.kode_ukuran,
      name: row.nama_ukuran,
      description: row.deskripsi ?? '',
      panjangCm: Number(row.panjang_cm),
      lebarCm: Number(row.lebar_cm),
    }));
  },
};
