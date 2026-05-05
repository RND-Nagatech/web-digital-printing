import { Order, OrderStatus } from '@/types/order';

export type OrderEntityDto = Order;

export interface CreateOrderRequestDto {
  nama_customer: string;
  no_hp: string;
  alamat: string;
  kode_bahan?: string;
  panjang?: number;
  lebar?: number;
  mata_ayam?: string;
  quantity?: number;
  items?: Array<{
    kode_bahan: string;
    panjang: number;
    lebar: number;
    quantity: number;
    mata_ayam?: string;
  }>;
  payment_method?: 'pay_now' | 'dp' | 'pay_later';
  dp_amount?: number;
}

export interface UpdateOrderStatusRequestDto {
  status: OrderStatus;
}
