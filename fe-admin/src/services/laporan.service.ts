import { apiGetData } from './api';

export interface RekapItem {
    kategori: string;
    kas_penjualan: 'KAS' | 'PENJUALAN';
    uang_keluar: number;
    uang_masuk: number;
}

export interface DetailItem {
    tanggal: string;
    kategori: string;
    deskripsi: string;
    uang_masuk: number;
    uang_keluar: number;
}

export interface FinanceSummary {
    saldo_awal: number;
    total_uang_masuk: number;
    total_uang_keluar: number;
    saldo_akhir: number;
}

export interface FinanceReportResponse {
    type: 'rekap' | 'detail';
    items: (RekapItem | DetailItem)[];
    summary: FinanceSummary;
}

export interface TopMaterialItem {
    kode_bahan: string;
    nama_bahan: string;
    total_qty: number;
    total_order_lines: number;
    total_area: number;
    total_revenue: number;
    total_orders: number;
}

export interface TopMaterialsResponse {
    items: TopMaterialItem[];
    summary: {
        total_materials: number;
        total_qty: number;
        total_revenue: number;
    };
    meta: {
        limit: number;
        from: string | null;
        to: string | null;
    };
}

export interface SalesTransactionItem {
    tanggal: string;
    no_faktur: string;
    pelanggan: string;
    pesanan: string;
    quantity: number;
    harga_jual_per_meter: number;
    harga_total: number;
    tunai: number;
    transfer: number;
    dp: number;
    sisa: number;
}

export interface SalesTransactionsResponse {
    items: SalesTransactionItem[];
    summary: {
        total_records: number;
        total_quantity: number;
        total_harga_total: number;
        total_tunai: number;
        total_transfer: number;
        total_dp: number;
        total_sisa: number;
    };
    meta: {
        from: string;
        to: string;
    };
}

export const laporanService = {
    getFinanceReport(params: {
        type: 'rekap' | 'detail';
        from?: string;
        to?: string;
        search?: string;
    }) {
        return apiGetData<FinanceReportResponse>('/reports/finance/report', { params });
    },
    getTopMaterials(params?: {
        from?: string;
        to?: string;
        search?: string;
        limit?: number;
    }) {
        return apiGetData<TopMaterialsResponse>('/reports/materials/top', { params });
    },
    getSalesTransactions(params: {
        from: string;
        to: string;
        search?: string;
    }) {
        return apiGetData<SalesTransactionsResponse>('/reports/sales/transactions', { params });
    },
};
