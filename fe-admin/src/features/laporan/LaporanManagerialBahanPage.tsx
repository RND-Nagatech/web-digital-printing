import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { RowInput } from 'jspdf-autotable';
import { toast } from 'sonner';
import cariDataIcon from '@/assets/cari-data.svg';
import emptyIcon from '@/assets/empty.svg';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { laporanService, TopMaterialItem } from '@/services/laporan.service';
import { storeService } from '@/services/store.service';
import { formatIDR, formatNumber } from '@/utils/formatters';
import { getPdfEngine } from './export-engine/lazy';
import { exportExcelWithWorker } from './export-engine/excel-worker.client';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const getTodayWib = () => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
};
const TODAY = getTodayWib();

export default function LaporanManagerialBahanPage() {
    const [from, setFrom] = useState(TODAY);
    const [to, setTo] = useState(TODAY);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState('20');
    const [appliedFrom, setAppliedFrom] = useState(TODAY);
    const [appliedTo, setAppliedTo] = useState(TODAY);
    const [appliedSearch, setAppliedSearch] = useState('');
    const [appliedLimit, setAppliedLimit] = useState('20');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [items, setItems] = useState<TopMaterialItem[]>([]);
    const [summary, setSummary] = useState({ total_materials: 0, total_qty: 0, total_revenue: 0 });
    const [filterError, setFilterError] = useState('');

    const loadReport = async (
        dateFrom = appliedFrom,
        dateTo = appliedTo,
        q = appliedSearch,
        topLimit = appliedLimit,
    ) => {
        const res = await laporanService.getTopMaterials({
            from: dateFrom,
            to: dateTo,
            search: q.trim() || undefined,
            limit: Number(topLimit),
        });
        setItems(res.items);
        setSummary(res.summary);
    };

    const onSearch = async () => {
        if (!from || !to) {
            setFilterError('Silahkan pilih tanggal awal dan tanggal akhir terlebih dahulu.');
            return;
        }
        if (from > to) {
            setFilterError('Tanggal awal tidak boleh lebih dari tanggal akhir.');
            return;
        }
        setFilterError('');
        setLoading(true);
        setSubmitted(true);
        setAppliedFrom(from);
        setAppliedTo(to);
        setAppliedSearch(search);
        setAppliedLimit(limit);
        try {
            await loadReport(from, to, search, limit);
        } catch {
            toast.error('Gagal memuat laporan managerial bahan');
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(async () => {
        if (!submitted || loading) return;
        await loadReport();
    }, { intervalMs: 10_000, enabled: submitted });

    useEffect(() => {
        if (!submitted) return;
        const timer = setTimeout(() => {
            setAppliedSearch(search);
            void loadReport(appliedFrom, appliedTo, search, appliedLimit);
        }, 350);
        return () => clearTimeout(timer);
    }, [search, submitted, appliedFrom, appliedTo, appliedLimit]);

    const ranked = useMemo(
        () => items.map((item, idx) => ({ ...item, rank: idx + 1 })),
        [items],
    );
    const canExport = submitted && !loading && items.length > 0;

    const exportPdf = async () => {
        try {
            const pdf = await getPdfEngine();
            const title = 'LAPORAN MANAGERIAL BAHAN';
            const rightInset = 40;
            const leftInset = 40;
            const store = await storeService.getReportHeader();

            const doc = pdf.createLandscapePdf();
            const pageWidth = doc.internal.pageSize.getWidth();
            pdf.drawStandardReportHeader(doc, {
                info: {
                    storeName: store?.nama_toko,
                    storeAddress: store?.alamat,
                    storePhone: store?.no_hp,
                },
                title,
                dateFrom: from,
                dateTo: to,
                leftInset,
                rightInset,
            });

            const head = [['No', 'Kode Bahan', 'Nama Bahan', 'Total Qty', 'Frekuensi Order', 'Total Omzet']];
            const body: RowInput[] = ranked.map((item) => [
                item.rank,
                item.kode_bahan,
                item.nama_bahan,
                formatNumber(item.total_qty),
                formatNumber(item.total_orders),
                formatNumber(item.total_revenue),
            ]);

            body.push(['', '', 'GRAND TOTAL', formatNumber(summary.total_qty), '', formatNumber(summary.total_revenue)]);

            pdf.renderReportTablePdf(doc, {
                head,
                body,
                autoTableOptions: {
                    theme: 'plain',
                    margin: { left: leftInset, right: rightInset },
                    tableWidth: pageWidth - leftInset - rightInset,
                    styles: { fontSize: 10, cellPadding: 7 },
                    headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    columnStyles: {
                        0: { halign: 'left', cellWidth: 44 },
                        1: { halign: 'left', cellWidth: 116 },
                        2: { halign: 'left', cellWidth: 250 },
                        3: { halign: 'right', cellWidth: 96 },
                        4: { halign: 'right', cellWidth: 120 },
                        5: { halign: 'right', cellWidth: 130 },
                    },
                },
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const summaryStartY = pdf.getLastAutoTableY(doc) + 14;
            const summaryValueX = pageWidth - rightInset;
            const summaryLabelX = summaryValueX - 200;
            const lineHeight = 22;
            const summaryBlockHeight = lineHeight * 3.2;
            const bottomSafePadding = 24;
            let safeSummaryStartY = summaryStartY;

            if (safeSummaryStartY + summaryBlockHeight > pageHeight - bottomSafePadding) {
                doc.addPage();
                safeSummaryStartY = 56;
            }

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text('Total Material :', summaryLabelX, safeSummaryStartY);
            doc.text(formatNumber(summary.total_materials), summaryValueX, safeSummaryStartY, { align: 'right' });
            doc.text('Total Qty :', summaryLabelX, safeSummaryStartY + lineHeight);
            doc.text(formatNumber(summary.total_qty), summaryValueX, safeSummaryStartY + lineHeight, { align: 'right' });
            doc.text('Total Omzet :', summaryLabelX, safeSummaryStartY + lineHeight * 2);
            doc.text(formatNumber(summary.total_revenue), summaryValueX, safeSummaryStartY + lineHeight * 2, { align: 'right' });

            let footerY = safeSummaryStartY + lineHeight * 3.1;
            if (footerY > pageHeight - 12) {
                doc.addPage();
                footerY = 40;
            }
            pdf.drawPdfPrintDate(doc, {
                label: `Print Date : ${new Date().toLocaleDateString('id-ID')}`,
                y: footerY,
            });

            pdf.savePdfFile(doc, `${title}.pdf`);
            toast.success('Export PDF berhasil');
        } catch {
            toast.error('Gagal export PDF');
        }
    };

    const exportExcel = async () => {
        try {
            const title = 'LAPORAN MANAGERIAL BAHAN';
            const store = await storeService.getReportHeader();
            await exportExcelWithWorker({
                kind: 'materials',
                fileName: `${title}.xlsx`,
                title,
                dateFrom: from,
                dateTo: to,
                storeName: store?.nama_toko,
                storeAddress: store?.alamat,
                items: ranked.map((item) => ({
                    rank: item.rank,
                    kodeBahan: item.kode_bahan,
                    namaBahan: item.nama_bahan,
                    totalQty: item.total_qty,
                    totalOrders: item.total_orders,
                    totalRevenue: item.total_revenue,
                })),
                summary: {
                    totalMaterials: summary.total_materials,
                    totalQty: summary.total_qty,
                    totalRevenue: summary.total_revenue,
                },
            });
            toast.success('Export Excel berhasil');
        } catch {
            toast.error('Gagal export Excel');
        }
    };

    return (
        <Card className="border-border-/70 overflow-hidden border p-0 shadow-card">
            <div className="bg-slate-800 px-4 py-4 sm:px-6">
                <h1 className="text-lg font-semibold text-white">Laporan Managerial Bahan</h1>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b bg-background px-4 py-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="relative w-full sm:col-span-2 lg:col-span-4">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Cari kode atau nama bahan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                void onSearch();
                            }
                        }}
                        className="h-10 bg-white pl-8"
                    />
                </div>

                <div className="w-full lg:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
                    <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 bg-white" />
                </div>

                <div className="w-full lg:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
                    <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 bg-white" />
                </div>

                <div className="w-full lg:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Top</label>
                    <Select value={limit} onValueChange={setLimit}>
                        <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="20">Top 20</SelectItem>
                            <SelectItem value="50">Top 50</SelectItem>
                            <SelectItem value="100">Top 100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full lg:col-span-2">
                    <label className="mb-1 block select-none text-xs text-transparent">Aksi</label>
                    <Button className="gradient-primary h-10 w-full text-primary-foreground shadow-glow hover:opacity-95" onClick={onSearch}>
                        Cari Data
                    </Button>
                </div>
            </div>

            {filterError && (
                <div className="border-b bg-background px-6 pb-4 pt-3 text-sm text-destructive">{filterError}</div>
            )}

            <div className="p-4 sm:p-6">
                <div className="border border-border bg-muted/20">
                    {!submitted ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground">
                            <img src={cariDataIcon} alt="Cari data laporan" className="h-40 w-40 object-contain sm:h-64 sm:w-64" />
                            <p>Silahkan klik <strong>Cari Data</strong> untuk menampilkan laporan</p>
                        </div>
                    ) : loading ? (
                        <div className="p-4 sm:p-6"><TableSkeleton cols={6} /></div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
                            <img src={emptyIcon} alt="Tidak ada data" className="h-40 w-40 object-contain sm:h-64 sm:w-64" />
                            <p className="text-lg font-semibold">Tidak Ada Data</p>
                            <p className="text-sm">Tidak ada order bahan untuk filter yang dipilih.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 text-left text-sm font-semibold text-foreground">
                                            <th className="w-20 px-5 py-3">Rank</th>
                                            <th className="px-5 py-3">Kode Bahan</th>
                                            <th className="px-5 py-3">Nama Bahan</th>
                                            <th className="px-5 py-3 text-right">Total Qty</th>
                                            <th className="px-5 py-3 text-right">Frekuensi Order</th>
                                            <th className="px-5 py-3 text-right">Total Omzet</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ranked.map((row) => (
                                            <tr key={`${row.kode_bahan}-${row.rank}`} className="border-t hover:bg-muted/30">
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex min-w-8 justify-center rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                        #{row.rank}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 font-medium">{row.kode_bahan}</td>
                                                <td className="px-5 py-4">{row.nama_bahan}</td>
                                                <td className="px-5 py-4 text-right tabular-nums">{formatNumber(row.total_qty)}</td>
                                                <td className="px-5 py-4 text-right tabular-nums">{formatNumber(row.total_orders)}</td>
                                                <td className="px-5 py-4 text-right font-semibold tabular-nums text-success">{formatIDR(row.total_revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t bg-muted/30 px-5 py-3 text-sm font-medium">
                                Total Record: {items.length}
                            </div>
                        </>
                    )}
                </div>

                {submitted && !loading && (
                    <>
                        <div className="mt-6 flex justify-end">
                            <div className="w-full max-w-sm space-y-2 text-right">
                                <p className="text-base sm:text-lg">Total Material: <span className="font-medium text-muted-foreground">{formatNumber(summary.total_materials)}</span></p>
                                <p className="text-base sm:text-lg">Total Qty: <span className="font-medium text-primary">{formatNumber(summary.total_qty)}</span></p>
                                <p className="text-lg font-semibold sm:text-xl">Total Omzet: <span className="text-success">{formatIDR(summary.total_revenue)}</span></p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    className="w-full bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/80"
                                    disabled={!canExport}
                                    onClick={() => { void exportPdf(); }}
                                >
                                    Export PDF
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:text-white/80"
                                    disabled={!canExport}
                                    onClick={() => { void exportExcel(); }}
                                >
                                    Export Excel
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
}
