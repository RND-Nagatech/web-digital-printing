export type FinanceExcelItem = {
    kategori?: string;
    deskripsi?: string;
    uangMasuk: number;
    uangKeluar: number;
};

export type FinanceExcelSummary = {
    saldoAwal: number;
    totalUangMasuk: number;
    totalUangKeluar: number;
    saldoAkhir: number;
};

export type MaterialsExcelItem = {
    rank: number;
    kodeBahan: string;
    namaBahan: string;
    totalQty: number;
    totalOrders: number;
    totalRevenue: number;
};

export type MaterialsExcelSummary = {
    totalMaterials: number;
    totalQty: number;
    totalRevenue: number;
};

export type BuildExcelPayload =
    | {
        kind: 'finance';
        fileName: string;
        title: string;
        dateFrom: string;
        dateTo: string;
        storeName?: string;
        storeAddress?: string;
        reportType: 'rekap' | 'detail';
        items: FinanceExcelItem[];
        summary: FinanceExcelSummary;
    }
    | {
        kind: 'materials';
        fileName: string;
        title: string;
        dateFrom: string;
        dateTo: string;
        storeName?: string;
        storeAddress?: string;
        items: MaterialsExcelItem[];
        summary: MaterialsExcelSummary;
    };

export type WorkerExcelSuccess = {
    ok: true;
    fileName: string;
    buffer: ArrayBuffer;
};

export type WorkerExcelError = {
    ok: false;
    error: string;
};

export type WorkerExcelResponse = WorkerExcelSuccess | WorkerExcelError;
