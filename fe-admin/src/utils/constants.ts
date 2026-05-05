export const APP_NAME = 'PrintFlow';
export const APP_TAGLINE = 'Sistem Digital Printing';

export const ORDER_STATUSES = [
  { value: 'open', label: 'Baru', color: 'info' },
  { value: 'processing', label: 'Diproses', color: 'info' },
  { value: 'printing', label: 'Printing', color: 'info' },
  { value: 'selesai', label: 'Selesai', color: 'success' },
  { value: 'cancelled', label: 'Dibatalkan', color: 'destructive' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Belum Bayar', color: 'destructive' },
  { value: 'dp', label: 'DP', color: 'warning' },
  { value: 'paid', label: 'Lunas', color: 'success' },
] as const;

export const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'owner', label: 'Owner' },
  { value: 'kasir', label: 'Kasir' },
] as const;

export const PERMISSIONS = {
  admin: ['dashboard', 'master', 'transaksi', 'keuangan', 'whatsapp', 'laporan', 'settings'],
  owner: ['dashboard', 'master', 'transaksi', 'keuangan', 'whatsapp', 'laporan', 'settings'],
  kasir: ['dashboard', 'transaksi', 'keuangan'],
} as const;
