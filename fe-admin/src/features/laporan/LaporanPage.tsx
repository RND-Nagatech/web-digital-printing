import { useMemo, useState } from 'react';
import { Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import type { RowInput } from 'jspdf-autotable';
import { toast } from 'sonner';
import cariDataIcon from '@/assets/cari-data.svg';
import emptyIcon from '@/assets/empty.svg';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { laporanService, RekapItem, DetailItem, FinanceSummary } from '@/services/laporan.service';
import { storeService } from '@/services/store.service';
import { formatIDR, formatDate, formatNumber } from '@/utils/formatters';
import { getPdfEngine } from './export-engine/lazy';
import { exportExcelWithWorker } from './export-engine/excel-worker.client';

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;
const TODAY = new Date().toISOString().slice(0, 10);

function isDetailItem(item: RekapItem | DetailItem): item is DetailItem {
  return 'kategori' in item;
}

export default function LaporanPage() {
  const [viewType, setViewType] = useState<'rekap' | 'detail'>('detail');
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [filterError, setFilterError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [items, setItems] = useState<(RekapItem | DetailItem)[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({ saldo_awal: 0, total_uang_masuk: 0, total_uang_keluar: 0, saldo_akhir: 0 });
  const [activeType, setActiveType] = useState<'rekap' | 'detail'>('detail');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
    setPage(1);
    try {
      const res = await laporanService.getFinanceReport({ type: viewType, from, to, search: search.trim() || undefined });
      setItems(res.items);
      setSummary(res.summary);
      setActiveType(viewType);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const paginated = useMemo(() => items.slice((page - 1) * limit, page * limit), [items, page, limit]);
  const fromItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, totalItems);

  const canExport = submitted && !loading && items.length > 0;

  const exportPdf = async () => {
    try {
      const pdf = await getPdfEngine();
      const reportDateFrom = from;
      const reportDateTo = to;
      const title = activeType === 'rekap' ? 'LAPORAN KEUANGAN (REKAP)' : 'LAPORAN KEUANGAN (DETAIL)';
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
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
        leftInset,
        rightInset,
      });

      const head = activeType === 'rekap'
        ? [['Kategori', 'Uang Masuk', 'Uang Keluar']]
        : [['No', 'Tanggal', 'Kategori', 'Deskripsi', 'Uang Masuk', 'Uang Keluar']];

      const body: RowInput[] = activeType === 'rekap'
        ? items.map((item) => {
          const r = item as RekapItem;
          return [
            r.kategori,
            formatNumber(r.uang_masuk),
            formatNumber(r.uang_keluar),
          ];
        })
        : items.map((item, idx) => {
          const d = item as DetailItem;
          return [
            idx + 1,
            d.tanggal,
            d.kategori,
            d.deskripsi,
            formatNumber(d.uang_masuk),
            formatNumber(d.uang_keluar),
          ];
        });

      body.push(
        activeType === 'rekap'
          ? ['GRAND TOTAL', formatNumber(summary.total_uang_masuk), formatNumber(summary.total_uang_keluar)]
          : ['', '', 'GRAND TOTAL', '', formatNumber(summary.total_uang_masuk), formatNumber(summary.total_uang_keluar)],
      );

      pdf.renderReportTablePdf(doc, {
        head,
        body,
        autoTableOptions: {
          theme: 'plain',
          margin: { left: leftInset, right: rightInset },
          tableWidth: pageWidth - leftInset - rightInset,
          styles: { fontSize: 10, cellPadding: 7 },
          headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
          columnStyles: activeType === 'rekap'
            ? {
              0: { halign: 'left', cellWidth: 510 },
              1: { halign: 'right', cellWidth: 126 },
              2: { halign: 'right', cellWidth: 126 },
            }
            : {
              0: { halign: 'left', cellWidth: 36 },
              1: { halign: 'left', cellWidth: 100 },
              2: { halign: 'left', cellWidth: 112 },
              3: { halign: 'left', cellWidth: 278 },
              4: { halign: 'right', cellWidth: 118 },
              5: { halign: 'right', cellWidth: 118 },
            },
        },
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const summaryStartY = pdf.getLastAutoTableY(doc) + 14;
      const summaryValueX = pageWidth - rightInset;
      const summaryLabelX = summaryValueX - 170;
      const lineHeight = 22;
      const summaryBlockHeight = lineHeight * 4.2;
      const bottomSafePadding = 24;
      let safeSummaryStartY = summaryStartY;

      if (safeSummaryStartY + summaryBlockHeight > pageHeight - bottomSafePadding) {
        doc.addPage();
        safeSummaryStartY = 56;
      }

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Saldo Awal :', summaryLabelX, safeSummaryStartY);
      doc.text(formatNumber(summary.saldo_awal), summaryValueX, safeSummaryStartY, { align: 'right' });
      doc.text('Uang Masuk :', summaryLabelX, safeSummaryStartY + lineHeight);
      doc.text(formatNumber(summary.total_uang_masuk), summaryValueX, safeSummaryStartY + lineHeight, { align: 'right' });
      doc.text('Uang Keluar :', summaryLabelX, safeSummaryStartY + lineHeight * 2);
      doc.text(formatNumber(summary.total_uang_keluar), summaryValueX, safeSummaryStartY + lineHeight * 2, { align: 'right' });
      doc.setLineWidth(0.8);
      doc.line(summaryLabelX, safeSummaryStartY + lineHeight * 2.45, summaryValueX, safeSummaryStartY + lineHeight * 2.45);
      doc.text('Saldo Akhir :', summaryLabelX, safeSummaryStartY + lineHeight * 3.35);
      doc.text(formatNumber(summary.saldo_akhir), summaryValueX, safeSummaryStartY + lineHeight * 3.35, { align: 'right' });

      let footerY = safeSummaryStartY + lineHeight * 4.2;
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
      const title = activeType === 'rekap' ? 'LAPORAN KEUANGAN (REKAP)' : 'LAPORAN KEUANGAN (DETAIL)';
      const store = await storeService.getReportHeader();
      await exportExcelWithWorker({
        kind: 'finance',
        fileName: `${title}.xlsx`,
        title,
        dateFrom: from,
        dateTo: to,
        storeName: store?.nama_toko,
        storeAddress: store?.alamat,
        reportType: activeType,
        items: activeType === 'rekap'
          ? items.map((item) => {
            const r = item as RekapItem;
            return {
              kategori: r.kategori,
              uangMasuk: r.uang_masuk,
              uangKeluar: r.uang_keluar,
            };
          })
          : items.map((item) => {
            const d = item as DetailItem;
            return {
              tanggal: d.tanggal,
              kategori: d.kategori,
              deskripsi: d.deskripsi,
              uangMasuk: d.uang_masuk,
              uangKeluar: d.uang_keluar,
            };
          }),
        summary: {
          saldoAwal: summary.saldo_awal,
          totalUangMasuk: summary.total_uang_masuk,
          totalUangKeluar: summary.total_uang_keluar,
          saldoAkhir: summary.saldo_akhir,
        },
      });
      toast.success('Export Excel berhasil');
    } catch {
      toast.error('Gagal export Excel');
    }
  };

  return (
    <Card className="overflow-hidden border border-border/70 p-0 shadow-card">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-white">Laporan Keuangan</h1>
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 border-b bg-background px-4 py-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="relative w-full sm:col-span-2 lg:col-span-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari deskripsi…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 bg-white pl-8" />
        </div>
        <div className="w-full lg:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Type</label>
          <Select value={viewType} onValueChange={(v) => setViewType(v as 'rekap' | 'detail')}>
            <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="detail">Detail</SelectItem>
              <SelectItem value="rekap">Rekap</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full lg:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 bg-white" />
        </div>
        <div className="w-full lg:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 bg-white" />
        </div>
        <div className="w-full lg:col-span-3">
          <label className="mb-1 block select-none text-xs text-transparent">Aksi</label>
          <Button className="h-10 w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-95" onClick={onSearch}>
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
            <div className="p-4 sm:p-6"><TableSkeleton /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
              <img src={emptyIcon} alt="Tidak ada data" className="h-40 w-40 object-contain sm:h-64 sm:w-64" />
              <p className="text-lg font-semibold">Tidak Ada Data</p>
              <p className="text-sm">Tidak ada transaksi untuk rentang tanggal yang dipilih.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {activeType === 'rekap' ? (
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left text-sm font-semibold text-foreground">
                        <th className="px-5 py-3">Kategori</th>
                        <th className="px-5 py-3 text-right">Uang Masuk</th>
                        <th className="px-5 py-3 text-right">Uang Keluar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paginated as RekapItem[]).map((r, idx) => (
                        <tr key={`${r.kas_penjualan}-${r.kategori}-${idx}`} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-4 font-medium">{r.kategori}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-success">{r.uang_masuk > 0 ? formatIDR(r.uang_masuk) : '-'}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-destructive">{r.uang_keluar > 0 ? formatIDR(r.uang_keluar) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left text-sm font-semibold text-foreground">
                        <th className="px-5 py-3">Tanggal</th>
                        <th className="px-5 py-3">Kategori</th>
                        <th className="px-5 py-3">Deskripsi</th>
                        <th className="px-5 py-3 text-right">Uang Masuk</th>
                        <th className="px-5 py-3 text-right">Uang Keluar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paginated as DetailItem[]).map((d, idx) => (
                        <tr key={`${d.tanggal}-${d.deskripsi}-${idx}`} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-4 text-muted-foreground">{formatDate(d.tanggal)}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${d.kategori === 'Kas Masuk' || d.kategori.startsWith('Order')
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                              }`}>
                              {d.kategori}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-medium">{d.deskripsi}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-success">
                            {d.uang_masuk > 0 ? formatIDR(d.uang_masuk) : '-'}
                          </td>
                          <td className="px-5 py-4 text-right tabular-nums text-destructive">
                            {d.uang_keluar > 0 ? formatIDR(d.uang_keluar) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="border-t bg-muted/30 px-5 py-3 text-sm font-medium">
                Total Record: {totalItems}
              </div>

              <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>Menampilkan {fromItem}–{toItem} dari {totalItems} data</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>Per halaman</span>
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-9 w-20 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="flex h-9 min-w-9 items-center justify-center rounded-md bg-slate-800 px-3 font-semibold text-white">{page}</div>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Summary + Export */}
        {submitted && !loading && (
          <>
            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-2 text-right">
                <p className="text-base sm:text-lg">Saldo Awal : <span className="font-medium text-muted-foreground">{formatIDR(summary.saldo_awal)}</span></p>
                <p className="text-base sm:text-lg">Total Uang Masuk : <span className="font-medium text-success">{formatIDR(summary.total_uang_masuk)}</span></p>
                <p className="text-base sm:text-lg">Total Uang Keluar : <span className="font-medium text-destructive">{formatIDR(summary.total_uang_keluar)}</span></p>
                <hr className="my-2 border-border" />
                <p className="text-lg font-semibold sm:text-xl">
                  Saldo Akhir : <span className={summary.saldo_akhir >= 0 ? 'text-success' : 'text-destructive'}>{formatIDR(summary.saldo_akhir)}</span>
                </p>
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

