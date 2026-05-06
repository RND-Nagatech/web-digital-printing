// Global domain types

export type ID = string;

export interface Material {
  id: ID;
  name: string;
  description: string;
  pricePerSqm: number; // IDR per m²
  imageUrl: string;
  recommended?: boolean;
}

export interface MataAyamOption {
  id: ID;
  label: string;
  description: string;
  extraPricePerSqm: number;
}

export interface SizePreset {
  id: ID;
  code: string;
  name: string;
  description?: string;
  panjangCm: number;
  lebarCm: number;
}

export type PaymentMethod = 'pay_now' | 'dp' | 'pay_later';
export type PaymentStatus = 'unpaid' | 'dp' | 'paid';
export type OrderStatus = 'open' | 'processing' | 'printing' | 'selesai' | 'cancelled';

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  email?: string;
}

export interface OrderPayload {
  customer: CustomerInfo;
  materialId: ID;
  panjang: number;
  lebar: number;
  quantity: number;
  mataAyamId: ID;
  items?: Array<{
    materialId: ID;
    panjang: number;
    lebar: number;
    quantity: number;
    mataAyamLabel?: string;
    materialName?: string;
    materialImage?: string;
    designFileUrl?: string;
  }>;
  notes?: string;
  paymentMethod: PaymentMethod;
  dpAmount?: number;
  designFileName?: string;
  proofFileName?: string;
}

export interface PriceBreakdown {
  area: number;
  materialPrice: number;
  optionPrice: number;
  total: number;
}

export interface Order extends OrderPayload {
  id: ID;
  no_faktur: string;
  kode_customer?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  dp_amount?: number;
  sisa?: number;
  total: number;
  createdAt: string;
  items?: Array<{
    kode_bahan: string;
    nama_bahan: string;
    panjang: number;
    lebar: number;
    area: number;
    mata_ayam?: string;
    quantity: number;
    harga_satuan: number;
    subtotal: number;
  }>;
}

export interface CartItem {
  id: ID;
  payload: OrderPayload;
  total: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface CustomerUser {
  id: ID;
  kode_customer: string;
  email: string;
  username: string;
  nama: string;
  alamat: string;
  no_hp: string;
  actor: 'customer';
}
