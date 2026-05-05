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
};
