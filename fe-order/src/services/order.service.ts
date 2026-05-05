import { api } from './api';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

type ApiWrap<T> = { success: boolean; message: string; data: T };
type Paged<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

type OrderItemDto = {
    kode_bahan: string;
    nama_bahan: string;
    panjang: number;
    lebar: number;
    area: number;
    mata_ayam?: string;
    quantity: number;
    harga_satuan: number;
    subtotal: number;
};

type OrderDto = {
    _id: string;
    no_faktur: string;
    kode_customer?: string;
    nama_customer: string;
    no_hp: string;
    alamat: string;
    kode_bahan: string;
    panjang: number;
    lebar: number;
    quantity: number;
    mata_ayam?: string;
    items?: OrderItemDto[];
    harga_total: number;
    status: OrderStatus;
    payment_status: PaymentStatus;
    dp_amount?: number;
    sisa?: number;
    created_at: string;
};

const mapOrder = (row: OrderDto): Order => ({
    id: row._id,
    no_faktur: row.no_faktur,
    kode_customer: row.kode_customer,
    customer: {
        name: row.nama_customer,
        phone: row.no_hp,
        address: row.alamat,
    },
    materialId: row.kode_bahan,
    panjang: row.panjang,
    lebar: row.lebar,
    quantity: row.quantity,
    mataAyamId: row.mata_ayam || 'none',
    paymentMethod: row.payment_status === 'paid' ? 'pay_now' : row.payment_status === 'dp' ? 'dp' : 'pay_later',
    status: row.status,
    payment_status: row.payment_status,
    dp_amount: row.dp_amount,
    sisa: row.sisa,
    total: row.harga_total,
    createdAt: row.created_at,
    items: row.items,
});

export const OrderService = {
    async getMy(params?: {
        page?: number;
        limit?: number;
        status?: OrderStatus | 'all';
        paymentStatus?: PaymentStatus | 'all';
    }): Promise<{ items: Order[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
        const res = await api.get<ApiWrap<Paged<OrderDto>>>('/orders/my', {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 50,
                ...(params?.status ? { status: params.status } : {}),
                ...(params?.paymentStatus ? { payment_status: params.paymentStatus } : {}),
            },
        });

        const data = res.data?.data;
        const items = (data?.items ?? []).map(mapOrder);
        return {
            items,
            meta: data?.meta ?? { page: 1, limit: 50, total: items.length, totalPages: 1 },
        };
    },
};
