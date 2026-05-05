import { CashEntry } from '@/types/order';

export type CashEntityDto = CashEntry;

export interface CreateCashRequestDto {
  type: 'PEMASUKAN' | 'PENGELUARAN';
  jumlah: number;
  deskripsi: string;
}
