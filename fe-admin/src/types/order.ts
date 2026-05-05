export type OrderStatus =
  | 'open'
  | 'processing'
  | 'printing'
  | 'selesai'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'dp' | 'paid';
export type PaymentSettlementMethod = 'transfer' | 'cash';

export interface Order {
  _id: string;
  no_faktur: string;
  nama_customer: string;
  no_hp: string;
  alamat: string;
  kode_bahan: string;
  panjang: number;
  lebar: number;
  area: number;
  mata_ayam?: string;
  quantity: number;
  design_file?: string;
  harga_total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_proof?: string;
  payment_settlement_method?: PaymentSettlementMethod;
  dp_amount?: number;
  sisa?: number;
  dibayar?: number;
  paid_date?: string;
  created_at: string;
  updated_date?: string;
  update_by?: string;
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

export interface CashEntry {
  _id: string;
  tanggal: string;
  type: 'PEMASUKAN' | 'PENGELUARAN';
  jumlah: number;
  deskripsi: string;
  created_date?: string;
  created_by?: string;
}

export interface AutoReplyRule {
  id: string;
  keyword: string;
  reply: string;
  active: boolean;
  matchType?: 'exact' | 'contains';
}

export interface WhatsAppSetting {
  connected: boolean;
  phoneNumber: string;
  sessionName: string;
  autoReplyEnabled: boolean;
}
