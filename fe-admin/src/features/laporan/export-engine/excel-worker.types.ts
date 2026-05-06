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

export type SalesExcelItem = {
    tanggal: string;
    noFaktur: string;
    pelanggan: string;
    pesanan: string;
    quantity: number;
    hargaJualPerMeter: number;
    hargaTotal: number;
    tunai: number;
    transfer: number;
    dp: number;
    sisa: number;
};

export type SalesExcelSummary = {
    totalRecords: number;
    totalQuantity: number;
    totalHargaTotal: number;
    totalTunai: number;
    totalTransfer: number;
    totalDp: number;
    totalSisa: number;
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
    }
    | {
        kind: 'sales-transactions';
        fileName: string;
        title: string;
        dateFrom: string;
        dateTo: string;
        storeName?: string;
        storeAddress?: string;
        items: SalesExcelItem[];
        summary: SalesExcelSummary;
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
