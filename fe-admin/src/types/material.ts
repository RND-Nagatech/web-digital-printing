export interface Material {
  _id: string;
  code: string;
  name: string;
  description?: string;
  price_per_meter: number;
  is_active: boolean;
  created_at: string;
}

export interface Eyelet {
  _id: string;
  name: string;
  created_at: string;
}

export interface Banner {
  _id: string;
  kode_bahan?: string;
  material_name?: string;
  material_description?: string;
  image_url: string;
  title?: string;
  deleted_by?: string | null;
  deleted_date?: string | null;
  created_at: string;
}
