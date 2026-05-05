/// <reference lib="webworker" />
import ExcelJS from 'exceljs';
import type { FillPattern } from 'exceljs';
import type { BuildExcelPayload, FinanceExcelItem, MaterialsExcelItem, WorkerExcelResponse } from './excel-worker.types';

const EXCEL_BORDER = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
} as const;

const EXCEL_HEADER_FILL: FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E5E5' },
};

const NUM_FMT_NUMBER = '#,##0';

const applyBorderRow = (row: ExcelJS.Row): void => {
    row.eachCell((cell) => {
        cell.border = EXCEL_BORDER;
    });
};

const styleHeaderRow = (row: ExcelJS.Row, alignRightFromCol?: number): void => {
    row.eachCell((cell) => {
        cell.font = { bold: true };
        const colIndex = typeof cell.col === 'number' ? cell.col : Number(cell.col);
        const isRight = typeof alignRightFromCol === 'number' && Number.isFinite(colIndex) && colIndex >= alignRightFromCol;
        cell.alignment = { horizontal: isRight ? 'right' : 'center', vertical: 'middle' };
        cell.fill = EXCEL_HEADER_FILL;
        cell.border = EXCEL_BORDER;
    });
};

const addStandardExcelHeader = (
    worksheet: ExcelJS.Worksheet,
    options: { title: string; dateFrom: string; dateTo: string; storeName?: string; storeAddress?: string; totalCols: number },
): void => {
    const {
        title, dateFrom, dateTo, storeName, storeAddress, totalCols,
    } = options;
    const endCol = worksheet.getColumn(totalCols).letter;

    worksheet.mergeCells(`A1:${endCol}1`);
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`A2:${endCol}2`);
    worksheet.getCell('A2').value = `Tanggal : ${dateFrom} s/d ${dateTo}`;
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`A3:${endCol}3`);
    worksheet.getCell('A3').value = `${(storeName ?? '-').toUpperCase()} | ${(storeAddress ?? '-').toUpperCase()}`;
    worksheet.getCell('A3').font = { bold: true, size: 11 };
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
};

const addPrintDateRow = (worksheet: ExcelJS.Worksheet, totalCols: number): void => {
    const endCol = worksheet.getColumn(totalCols).letter;
    const row = worksheet.addRow([`Print Date : ${new Date().toLocaleDateString('id-ID')}`]);
    worksheet.mergeCells(`A${row.number}:${endCol}${row.number}`);
    row.getCell(1).font = { italic: true, size: 10 };
    row.getCell(1).alignment = { horizontal: 'left' };
};

const createWorkbook = (sheetName: string): { workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet } => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    return { workbook, worksheet };
};

const buildFinanceWorkbook = (payload: BuildExcelPayload): ExcelJS.Workbook => {
    if (payload.kind !== 'finance') {
        throw new Error('Invalid payload kind for finance workbook');
    }
    const { workbook, worksheet } = createWorkbook(payload.title);
    const isRekap = payload.reportType === 'rekap';
    const totalCols = isRekap ? 3 : 5;

    worksheet.columns = isRekap
        ? [{ width: 50 }, { width: 20 }, { width: 20 }]
        : [{ width: 16 }, { width: 20 }, { width: 38 }, { width: 16 }, { width: 16 }];

    addStandardExcelHeader(worksheet, {
        title: payload.title,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        storeName: payload.storeName,
        storeAddress: payload.storeAddress,
        totalCols,
    });

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(
        isRekap
            ? ['Kategori', 'Uang Masuk', 'Uang Keluar']
            : ['Tanggal', 'Kategori', 'Deskripsi', 'Uang Masuk', 'Uang Keluar'],
    );
    styleHeaderRow(headerRow, isRekap ? 2 : 4);
    headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    if (!isRekap) {
        headerRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        headerRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    }
    headerRow.height = 26;

    let currentRow = headerRow.number + 1;
    payload.items.forEach((item: FinanceExcelItem) => {
        const row = worksheet.getRow(currentRow);
        const values = isRekap
            ? [(item.kategori ?? '-').toUpperCase(), item.uangMasuk, item.uangKeluar]
            : [item.tanggal, (item.kategori ?? '-').toUpperCase(), item.deskripsi ?? '-', item.uangMasuk, item.uangKeluar];

        values.forEach((value, idx) => {
            row.getCell(idx + 1).value = value;
        });

        const moneyStartCol = isRekap ? 2 : 4;
        row.getCell(moneyStartCol).alignment = { horizontal: 'right' };
        row.getCell(moneyStartCol + 1).alignment = { horizontal: 'right' };
        row.getCell(moneyStartCol).numFmt = NUM_FMT_NUMBER;
        row.getCell(moneyStartCol + 1).numFmt = NUM_FMT_NUMBER;
        applyBorderRow(row);
        row.height = 24;
        currentRow += 1;
    });

    const totalRow = worksheet.getRow(currentRow);
    if (isRekap) {
        totalRow.getCell(1).value = 'GRAND TOTAL';
        totalRow.getCell(2).value = payload.summary.totalUangMasuk;
        totalRow.getCell(3).value = payload.summary.totalUangKeluar;
        totalRow.getCell(2).numFmt = NUM_FMT_NUMBER;
        totalRow.getCell(3).numFmt = NUM_FMT_NUMBER;
        totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        totalRow.getCell(1).value = 'GRAND TOTAL';
        totalRow.getCell(4).value = payload.summary.totalUangMasuk;
        totalRow.getCell(5).value = payload.summary.totalUangKeluar;
        totalRow.getCell(4).numFmt = NUM_FMT_NUMBER;
        totalRow.getCell(5).numFmt = NUM_FMT_NUMBER;
        totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
        totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    }

    for (let col = 1; col <= totalCols; col += 1) {
        const cell = totalRow.getCell(col);
        cell.font = { bold: true, size: 11 };
        cell.fill = EXCEL_HEADER_FILL;
    }
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorderRow(totalRow);
    totalRow.height = 26;

    const summaryStartRow = currentRow + 2;
    const summaryMergeEndCol = isRekap ? 'B' : 'D';
    const summaryValueCol = isRekap ? 3 : 5;
    const summaryRows = [
        ['Saldo Awal', payload.summary.saldoAwal],
        ['Uang Masuk', payload.summary.totalUangMasuk],
        ['Uang Keluar', payload.summary.totalUangKeluar],
        ['Saldo Akhir', payload.summary.saldoAkhir],
    ] as const;

    summaryRows.forEach(([label, value], idx) => {
        const rowNumber = summaryStartRow + idx;
        const row = worksheet.getRow(rowNumber);
        worksheet.mergeCells(`A${rowNumber}:${summaryMergeEndCol}${rowNumber}`);
        row.getCell(1).value = label;
        row.getCell(summaryValueCol).value = value;
        row.getCell(1).font = { bold: true, size: 11 };
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(summaryValueCol).font = { bold: true, size: 11 };
        row.getCell(summaryValueCol).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(summaryValueCol).numFmt = NUM_FMT_NUMBER;
        for (let col = 1; col <= totalCols; col += 1) {
            row.getCell(col).fill = EXCEL_HEADER_FILL;
        }
        applyBorderRow(row);
        row.height = 24;
    });

    addPrintDateRow(worksheet, totalCols);
    for (let i = 1; i <= 3; i += 1) worksheet.getRow(i).height = 22;
    worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
    return workbook;
};

const buildMaterialsWorkbook = (payload: BuildExcelPayload): ExcelJS.Workbook => {
    if (payload.kind !== 'materials') {
        throw new Error('Invalid payload kind for materials workbook');
    }

    const { workbook, worksheet } = createWorkbook(payload.title);
    const totalCols = 6;

    worksheet.columns = [
        { width: 10 },
        { width: 18 },
        { width: 34 },
        { width: 14 },
        { width: 18 },
        { width: 20 },
    ];

    addStandardExcelHeader(worksheet, {
        title: payload.title,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        storeName: payload.storeName,
        storeAddress: payload.storeAddress,
        totalCols,
    });

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['No', 'Kode Bahan', 'Nama Bahan', 'Total Qty', 'Frekuensi Order', 'Total Omzet']);
    styleHeaderRow(headerRow, 4);
    headerRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    headerRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    headerRow.height = 26;

    let currentRow = headerRow.number + 1;
    payload.items.forEach((item: MaterialsExcelItem) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = item.rank;
        row.getCell(2).value = (item.kodeBahan ?? '-').toUpperCase();
        row.getCell(3).value = item.namaBahan ?? '-';
        row.getCell(4).value = item.totalQty;
        row.getCell(5).value = item.totalOrders;
        row.getCell(6).value = item.totalRevenue;

        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(4).numFmt = NUM_FMT_NUMBER;
        row.getCell(5).numFmt = NUM_FMT_NUMBER;
        row.getCell(6).numFmt = NUM_FMT_NUMBER;
        applyBorderRow(row);
        row.height = 24;
        currentRow += 1;
    });

    const totalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    totalRow.getCell(1).value = 'GRAND TOTAL';
    totalRow.getCell(4).value = payload.summary.totalQty;
    totalRow.getCell(5).value = '';
    totalRow.getCell(6).value = payload.summary.totalRevenue;
    totalRow.getCell(4).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(6).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    for (let col = 1; col <= totalCols; col += 1) {
        const cell = totalRow.getCell(col);
        cell.font = { bold: true, size: 11 };
        cell.fill = EXCEL_HEADER_FILL;
    }
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorderRow(totalRow);
    totalRow.height = 26;

    const summaryStartRow = currentRow + 2;
    const summaryRows = [
        ['Total Material', payload.summary.totalMaterials],
        ['Total Qty', payload.summary.totalQty],
        ['Total Omzet', payload.summary.totalRevenue],
    ] as const;

    summaryRows.forEach(([label, value], idx) => {
        const rowNumber = summaryStartRow + idx;
        const row = worksheet.getRow(rowNumber);
        worksheet.mergeCells(`A${rowNumber}:E${rowNumber}`);
        row.getCell(1).value = label;
        row.getCell(6).value = value;
        row.getCell(1).font = { bold: true, size: 11 };
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(6).font = { bold: true, size: 11 };
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(6).numFmt = NUM_FMT_NUMBER;
        for (let col = 1; col <= totalCols; col += 1) {
            row.getCell(col).fill = EXCEL_HEADER_FILL;
        }
        applyBorderRow(row);
        row.height = 24;
    });

    addPrintDateRow(worksheet, totalCols);
    for (let i = 1; i <= 3; i += 1) worksheet.getRow(i).height = 22;
    worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
    return workbook;
};

const toArrayBuffer = (bufferLike: unknown): ArrayBuffer => {
    if (bufferLike instanceof ArrayBuffer) return bufferLike.slice(0);
    if (typeof SharedArrayBuffer !== 'undefined' && bufferLike instanceof SharedArrayBuffer) {
        return new Uint8Array(bufferLike).slice().buffer;
    }
    if (ArrayBuffer.isView(bufferLike)) {
        const view = bufferLike as ArrayBufferView;
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice().buffer;
    }
    throw new Error('Unsupported excel buffer type');
};

self.onmessage = async (event: MessageEvent<BuildExcelPayload>): Promise<void> => {
    try {
        const payload = event.data;
        const workbook = payload.kind === 'finance'
            ? buildFinanceWorkbook(payload)
            : buildMaterialsWorkbook(payload);
        const rawBuffer = await workbook.xlsx.writeBuffer();
        const buffer = toArrayBuffer(rawBuffer);
        const response: WorkerExcelResponse = { ok: true, fileName: payload.fileName, buffer };
        self.postMessage(response, [buffer]);
    } catch (error) {
        const response: WorkerExcelResponse = {
            ok: false,
            error: error instanceof Error ? error.message : 'Gagal membuat file Excel',
        };
        self.postMessage(response);
    }
};

export { };
