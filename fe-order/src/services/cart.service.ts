import { api } from './api';
import type { CartItem } from '@/types';
import type { OrderPayload } from '@/types';

type ApiWrap<T> = { success: boolean; message: string; data: T };

type CartEntityDto = {
    _id: string;
    kode_customer: string;
    nama_customer: string;
    no_hp: string;
    alamat: string;
    items: Array<{
        kode_bahan: string;
        panjang: number;
        lebar: number;
        quantity: number;
        mata_ayam?: string;
        nama_bahan?: string;
        gambar_bahan?: string;
    }>;
    payment_method: 'pay_now' | 'dp' | 'pay_later';
    dp_amount?: number;
    notes?: string;
    design_file?: string;
    payment_proof?: string;
    estimated_total?: number;
    created_at: string;
};

const mapCart = (raw: CartEntityDto): CartItem => {
    const first = raw.items?.[0];
    const payload: OrderPayload = {
        customer: {
            name: raw.nama_customer,
            phone: raw.no_hp,
            address: raw.alamat,
        },
        materialId: first?.kode_bahan ?? '',
        panjang: first?.panjang ?? 0,
        lebar: first?.lebar ?? 0,
        quantity: first?.quantity ?? 1,
        mataAyamId: first?.mata_ayam ?? 'none',
        items: (raw.items ?? []).map((item) => ({
            materialId: item.kode_bahan,
            panjang: item.panjang,
            lebar: item.lebar,
            quantity: item.quantity,
            mataAyamLabel: item.mata_ayam,
            materialName: item.nama_bahan,
            materialImage: item.gambar_bahan,
        })),
        notes: raw.notes,
        paymentMethod: raw.payment_method,
        dpAmount: raw.dp_amount,
    };

    return {
        id: raw._id,
        payload,
        total: raw.estimated_total ?? 0,
        createdAt: raw.created_at,
    };
};

export const CartService = {
    async getMy(): Promise<{ items: CartItem[]; total: number }> {
        const res = await api.get<ApiWrap<{ items: CartEntityDto[]; meta: { total: number } }>>('/carts/my');
        const items = (res.data.data?.items ?? []).map(mapCart);
        return {
            items,
            total: res.data.data?.meta?.total ?? items.length,
        };
    },

    async addItem(payload: {
        order: OrderPayload;
        total: number;
        designFile?: File;
        proofFile?: File;
    }) {
        const fd = new FormData();
        fd.append('nama_customer', payload.order.customer.name);
        fd.append('no_hp', payload.order.customer.phone);
        fd.append('alamat', payload.order.customer.address || '-');
        fd.append('payment_method', payload.order.paymentMethod);
        if (payload.order.dpAmount && payload.order.dpAmount > 0) fd.append('dp_amount', String(payload.order.dpAmount));
        if (payload.order.notes) fd.append('notes', payload.order.notes);
        fd.append('estimated_total', String(payload.total));

        const items = payload.order.items?.length
            ? payload.order.items.map((item) => ({
                kode_bahan: item.materialId,
                panjang: item.panjang,
                lebar: item.lebar,
                quantity: item.quantity,
                ...(item.mataAyamLabel ? { mata_ayam: item.mataAyamLabel } : {}),
                ...(item.materialName ? { nama_bahan: item.materialName } : {}),
                ...(item.materialImage ? { gambar_bahan: item.materialImage } : {}),
            }))
            : [{
                kode_bahan: payload.order.materialId,
                panjang: payload.order.panjang,
                lebar: payload.order.lebar,
                quantity: payload.order.quantity,
            }];

        fd.append('items', JSON.stringify(items));
        if (payload.designFile) fd.append('design_file', payload.designFile);
        if (payload.proofFile) fd.append('payment_proof', payload.proofFile);

        const res = await api.post<ApiWrap<CartEntityDto>>('/carts', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        return mapCart(res.data.data);
    },

    async remove(id: string) {
        await api.delete(`/carts/${id}`);
        return { deleted: true };
    },

    async update(id: string, payload: {
        items?: Array<{
            kode_bahan: string;
            panjang: number;
            lebar: number;
            quantity: number;
            mata_ayam?: string;
            nama_bahan?: string;
            gambar_bahan?: string;
        }>;
        estimated_total?: number;
    }) {
        const res = await api.patch<ApiWrap<CartEntityDto>>(`/carts/${id}`, payload);
        return mapCart(res.data.data);
    },

    async clear() {
        await api.delete('/carts/my/clear');
        return { deleted: true };
    },

    async checkout(ids: string[]) {
        const res = await api.post<ApiWrap<{ checkedOut: number }>>('/carts/checkout', { ids });
        return res.data.data;
    },
};
