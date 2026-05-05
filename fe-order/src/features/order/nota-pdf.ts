import jsPDF from 'jspdf';
import type { Order } from '@/types';
import { formatIDR } from '@/utils/format';

type PdfWithGState = jsPDF & {
    setGState?: (gState: unknown) => void;
    GState?: new (options: { opacity: number }) => unknown;
};

type StoreHeader = {
    nama_toko?: string;
    alamat?: string;
    no_hp?: string;
} | null;

export const loadImageAsDataUrl = (src: string): Promise<string | null> =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

const drawWatermark = (
    doc: jsPDF,
    watermarkDataUrl: string | null,
    area: { left: number; top: number; width: number; height: number },
) => {
    if (!watermarkDataUrl) return;
    try {
        const props = doc.getImageProperties(watermarkDataUrl);
        const width = Math.min(120, area.width * 0.35);
        const height = width * (props.height / props.width);
        const x = area.left + (area.width - width) / 2;
        const y = area.top + (area.height - height) / 2;
        const d = doc as PdfWithGState;
        if (typeof d.setGState === 'function' && typeof d.GState === 'function') {
            d.setGState(new d.GState({ opacity: 0.16 }));
        }
        doc.addImage(watermarkDataUrl, 'PNG', x, y, width, height);
        if (typeof d.setGState === 'function' && typeof d.GState === 'function') {
            d.setGState(new d.GState({ opacity: 1 }));
        }
    } catch {
        // Keep nota rendering even when watermark cannot be loaded.
    }
};

const lineItemFromOrder = (order: Order, materialName?: string) => {
    const unitPrice = Math.max(0, Math.round(order.total / Math.max(1, order.quantity)));
    const baseName = (materialName?.trim() || order.materialId).toUpperCase();
    const sizeLabel = `${order.panjang} x ${order.lebar} m`;
    return {
        name: `${baseName} (${sizeLabel})`,
        qty: order.quantity,
        unitPrice,
        subtotal: order.total,
    };
};

const lineItemsFromOrder = (order: Order, materialName?: string) => {
    if (order.items?.length) {
        return order.items.map((item) => ({
            name: `${(item.nama_bahan || item.kode_bahan).toUpperCase()} (${item.panjang} x ${item.lebar} m)`,
            qty: item.quantity,
            unitPrice: item.harga_satuan,
            subtotal: item.subtotal,
        }));
    }
    return [lineItemFromOrder(order, materialName)];
};

const chunkItems = <T,>(list: T[], size: number): T[][] => {
    if (size <= 0) return [list];
    const chunks: T[][] = [];
    for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
    return chunks.length ? chunks : [[]];
};

const drawKeyValue = (
    doc: jsPDF,
    opts: {
        labelX: number;
        colonX: number;
        valueX: number;
        y: number;
        label: string;
        value: string;
        maxWidth?: number;
    },
) => {
    const {
        labelX, colonX, valueX, y, label, value, maxWidth,
    } = opts;
    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    doc.text(value, valueX, y, maxWidth ? { maxWidth } : undefined);
};

export const downloadOrderNotaPdf = (params: {
    order: Order;
    store: StoreHeader;
    logoDataUrl: string | null;
    watermarkDataUrl: string | null;
    materialName?: string;
}) => {
    const {
        order, store, logoDataUrl, watermarkDataUrl, materialName,
    } = params;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const allItems = lineItemsFromOrder(order, materialName);
    const chunks = chunkItems(allItems, 5);
    const sectionsPerPage = 2;
    const pageMargin = 14;
    const sectionGap = 10;
    const sectionHeight = (pageH - pageMargin * 2 - sectionGap) / sectionsPerPage;

    chunks.forEach((chunk, chunkIndex) => {
        if (chunkIndex > 0 && chunkIndex % sectionsPerPage === 0) doc.addPage();

        const sectionIndex = chunkIndex % sectionsPerPage;

        const left = 24;
        const right = pageW - 24;
        const top = pageMargin + sectionIndex * (sectionHeight + sectionGap);
        const sectionBottom = top + sectionHeight;

        doc.setDrawColor(70, 70, 70);
        doc.setLineWidth(1);
        doc.rect(left, top, right - left, sectionHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text((store?.nama_toko ?? 'DIGITAL PRINTING').toUpperCase(), left + 12, top + 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        drawKeyValue(doc, {
            labelX: left + 12,
            colonX: left + 44,
            valueX: left + 52,
            y: top + 34,
            label: 'Alamat',
            value: store?.alamat ?? '-',
        });
        drawKeyValue(doc, {
            labelX: left + 12,
            colonX: left + 44,
            valueX: left + 52,
            y: top + 46,
            label: 'No HP',
            value: store?.no_hp ?? '-',
        });

        if (logoDataUrl) {
            try {
                const p = doc.getImageProperties(logoDataUrl);
                const w = 42;
                const h = w * (p.height / p.width);
                doc.addImage(logoDataUrl, 'PNG', right - 12 - w, top + 8, w, h);
            } catch {
                // Keep nota rendering even when logo cannot be loaded.
            }
        }

        doc.setLineWidth(0.6);
        doc.line(left + 10, top + 56, right - 10, top + 56);

        const infoY = top + 70;
        const infoLabelX = left + 12;
        const infoColonX = left + 84;
        const infoValueX = left + 92;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('NOTA PENJUALAN', left + 18, infoY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        drawKeyValue(doc, {
            labelX: infoLabelX,
            colonX: infoColonX,
            valueX: infoValueX,
            y: infoY + 14,
            label: 'No Nota',
            value: order.no_faktur,
        });
        drawKeyValue(doc, {
            labelX: infoLabelX,
            colonX: infoColonX,
            valueX: infoValueX,
            y: infoY + 26,
            label: 'Tanggal',
            value: new Date(order.createdAt).toLocaleString('id-ID'),
        });
        drawKeyValue(doc, {
            labelX: infoLabelX,
            colonX: infoColonX,
            valueX: infoValueX,
            y: infoY + 38,
            label: 'Pelanggan',
            value: order.customer.name,
        });
        drawKeyValue(doc, {
            labelX: infoLabelX,
            colonX: infoColonX,
            valueX: infoValueX,
            y: infoY + 50,
            label: 'No HP',
            value: order.customer.phone,
        });
        drawKeyValue(doc, {
            labelX: infoLabelX,
            colonX: infoColonX,
            valueX: infoValueX,
            y: infoY + 62,
            label: 'Alamat',
            value: order.customer.address || '-',
            maxWidth: pageW - 220,
        });

        const tableY = infoY + 74;
        const colX = [left + 12, left + 42, left + 355, left + 430, left + 490, right - 12];
        const headerH = 16;
        const dataRowH = 12;
        const grandH = 18;
        const grandRowTop = tableY + headerH + dataRowH * 5;
        const tableHeight = headerH + dataRowH * 5 + grandH;

        doc.setLineWidth(0.6);
        doc.rect(colX[0], tableY, colX[5] - colX[0], tableHeight);
        for (let i = 1; i < colX.length - 1; i += 1) {
            if (i === 4) {
                doc.line(colX[i], tableY, colX[i], tableY + tableHeight);
                continue;
            }
            doc.line(colX[i], tableY, colX[i], grandRowTop);
        }
        doc.line(colX[0], tableY + headerH, colX[5], tableY + headerH);
        for (let r = 1; r <= 5; r += 1) {
            const y = tableY + headerH + dataRowH * r;
            doc.line(colX[0], y, colX[5], y);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('NO', (colX[0] + colX[1]) / 2, tableY + 11, { align: 'center' });
        doc.text('JENIS BARANG', colX[1] + 4, tableY + 11);
        doc.text('HARGA', (colX[2] + colX[3]) / 2, tableY + 11, { align: 'center' });
        doc.text('QTY', (colX[3] + colX[4]) / 2, tableY + 11, { align: 'center' });
        doc.text('JUMLAH', (colX[4] + colX[5]) / 2, tableY + 11, { align: 'center' });

        const padded = [...chunk];
        while (padded.length < 5) {
            padded.push({ name: '', qty: 0, unitPrice: 0, subtotal: 0 });
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        padded.forEach((item, idx) => {
            const y = tableY + headerH + dataRowH * idx + dataRowH / 2 + 3;
            doc.text(item.name ? String(idx + 1 + chunkIndex * 5) : '', (colX[0] + colX[1]) / 2, y, { align: 'center' });
            doc.text(item.name, colX[1] + 4, y, { maxWidth: colX[2] - colX[1] - 8 });
            doc.text(item.name ? formatIDR(item.unitPrice) : '', colX[3] - 4, y, { align: 'right' });
            doc.text(item.name ? String(item.qty) : '', (colX[3] + colX[4]) / 2, y, { align: 'center' });
            doc.text(item.name ? formatIDR(item.subtotal) : '', colX[5] - 4, y, { align: 'right' });
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const grandLabelX = (colX[0] + colX[4]) / 2;
        const grandY = grandRowTop + grandH / 2 + 3;
        doc.text('GRAND TOTAL', grandLabelX, grandY, { align: 'center' });
        doc.text(formatIDR(order.total), colX[5] - 4, grandY, { align: 'right' });

        drawWatermark(doc, watermarkDataUrl, {
            left,
            top,
            width: right - left,
            height: sectionHeight,
        });

        const paymentY = tableY + tableHeight + 8;
        const paymentStatus = order.payment_status === 'paid' ? 'LUNAS' : order.payment_status === 'dp' ? 'DP' : 'BELUM BAYAR';
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        drawKeyValue(doc, {
            labelX: left + 12,
            colonX: left + 104,
            valueX: left + 112,
            y: paymentY,
            label: 'Status Pembayaran',
            value: paymentStatus,
        });
        drawKeyValue(doc, {
            labelX: left + 12,
            colonX: left + 104,
            valueX: left + 112,
            y: paymentY + 10,
            label: 'Dibayar',
            value: formatIDR(order.payment_status === 'dp' ? order.dp_amount ?? 0 : order.total),
        });
        drawKeyValue(doc, {
            labelX: left + 12,
            colonX: left + 104,
            valueX: left + 112,
            y: paymentY + 20,
            label: 'Sisa',
            value: formatIDR(order.sisa ?? 0),
        });

        const signX = right - 150;
        const signY = paymentY;
        doc.setFontSize(8);
        doc.text('Hormat Kami,', signX, signY, { align: 'center' });
        doc.text('(...........................)', signX, signY + 18, { align: 'center' });

        doc.setFontSize(7);
        doc.text(`Print Date : ${new Date().toLocaleDateString('id-ID')}`, right - 12, sectionBottom - 8, { align: 'right' });
    });

    doc.save(`NOTA-${order.no_faktur}.pdf`);
};
