import { useEffect, useMemo, useState } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search } from 'lucide-react';
import type { RowInput } from 'jspdf-autotable';
import { toast } from 'sonner';
import cariDataIcon from '@/assets/cari-data.svg';
import emptyIcon from '@/assets/empty.svg';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { laporanService, SalesTransactionItem } from '@/services/laporan.service';
import { storeService } from '@/services/store.service';
import { formatIDR, formatNumber } from '@/utils/formatters';
import { getPdfEngine } from './export-engine/lazy';
import { exportExcelWithWorker } from './export-engine/excel-worker.client';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

const getTodayWib = () => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
};
const TODAY = getTodayWib();

export default function LaporanTransaksiPenjualanPage() {
  const [from, setFrom] = useState(TODAY);
  const [to, setTo] = useState(TODAY);
  const [search, setSearch] = useState('');
  const [appliedFrom, setAppliedFrom] = useState(TODAY);
  const [appliedTo, setAppliedTo] = useState(TODAY);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [items, setItems] = useState<SalesTransactionItem[]>([]);
  const [summary, setSummary] = useState({
    total_records: 0,
    total_quantity: 0,
    total_harga_total: 0,
    total_tunai: 0,
    total_transfer: 0,
    total_dp: 0,
    total_sisa: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadReport = async (dateFrom = appliedFrom, dateTo = appliedTo, q = appliedSearch) => {
    const res = await laporanService.getSalesTransactions({
      from: dateFrom,
      to: dateTo,
      search: q.trim() || undefined,
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
    setPage(1);
    try {
      await loadReport(from, to, search);
    } catch {
      toast.error('Gagal memuat laporan transaksi penjualan');
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
      setPage(1);
      void loadReport(appliedFrom, appliedTo, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, submitted, appliedFrom, appliedTo]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const paginated = useMemo(() => items.slice((page - 1) * limit, page * limit), [items, page, limit]);
  const fromItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, totalItems);

  const canExport = submitted && !loading && items.length > 0;

  const exportPdf = async () => {
    try {
      const pdf = await getPdfEngine();
      const title = 'LAPORAN TRANSAKSI PENJUALAN';
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
        dateFrom: appliedFrom,
        dateTo: appliedTo,
        leftInset,
        rightInset,
      });

      const head = [[
        'No',
        'Tanggal',
        'No Faktur',
        'Pelanggan',
        'Pesanan',
        'Qty',
        'Harga / M',
        'Harga Total',
        'Tunai',
        'Transfer',
        'DP',
        'Sisa',
      ]];

      const body: RowInput[] = items.map((row, idx) => ([
        idx + 1,
        row.tanggal,
        row.no_faktur,
        row.pelanggan,
        row.pesanan,
        formatNumber(row.quantity),
        formatNumber(row.harga_jual_per_meter),
        formatNumber(row.harga_total),
        formatNumber(row.tunai),
        formatNumber(row.transfer),
        formatNumber(row.dp),
        formatNumber(row.sisa),
      ]));

      pdf.renderReportTablePdf(doc, {
        head,
        body,
        autoTableOptions: {
          theme: 'plain',
          margin: { left: leftInset, right: rightInset },
          tableWidth: pageWidth - leftInset - rightInset,
          styles: { fontSize: 8, cellPadding: 5 },
          headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index >= 5) {
              data.cell.styles.halign = 'right';
            }
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 24 },
            1: { halign: 'left', cellWidth: 56 },
            2: { halign: 'left', cellWidth: 74 },
            3: { halign: 'left', cellWidth: 64 },
            4: { halign: 'left', cellWidth: 152 },
            5: { halign: 'right', cellWidth: 36 },
            6: { halign: 'right', cellWidth: 64 },
            7: { halign: 'right', cellWidth: 68 },
            8: { halign: 'right', cellWidth: 54 },
            9: { halign: 'right', cellWidth: 54 },
            10: { halign: 'right', cellWidth: 58 },
            11: { halign: 'right', cellWidth: 58 },
          },
        },
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      let footerY = pdf.getLastAutoTableY(doc) + 16;
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
      const title = 'LAPORAN TRANSAKSI PENJUALAN';
      const store = await storeService.getReportHeader();
      await exportExcelWithWorker({
        kind: 'sales-transactions',
        fileName: `${title}.xlsx`,
        title,
        dateFrom: appliedFrom,
        dateTo: appliedTo,
        storeName: store?.nama_toko,
        storeAddress: store?.alamat,
        items: items.map((row) => ({
          tanggal: row.tanggal,
          noFaktur: row.no_faktur,
          pelanggan: row.pelanggan,
          pesanan: row.pesanan,
          quantity: row.quantity,
          hargaJualPerMeter: row.harga_jual_per_meter,
          hargaTotal: row.harga_total,
          tunai: row.tunai,
          transfer: row.transfer,
          dp: row.dp,
          sisa: row.sisa,
        })),
        summary: {
          totalRecords: summary.total_records,
          totalQuantity: summary.total_quantity,
          totalHargaTotal: summary.total_harga_total,
          totalTunai: summary.total_tunai,
          totalTransfer: summary.total_transfer,
          totalDp: summary.total_dp,
          totalSisa: summary.total_sisa,
        },
      });
      toast.success('Export Excel berhasil');
    } catch {
      toast.error('Gagal export Excel');
    }
  };

  return (
    <Card className="overflow-hidden border border-border/70 p-0 shadow-card">
      <div className="bg-slate-800 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-white">Laporan Transaksi Penjualan</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b bg-background px-4 py-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="w-full lg:col-span-4">
          <label className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 bg-white" />
        </div>
        <div className="w-full lg:col-span-4">
          <label className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 bg-white" />
        </div>
        <div className="w-full lg:col-span-4">
          <label className="mb-1 block select-none text-xs text-transparent">Aksi</label>
          <Button className="h-10 w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-95" onClick={onSearch}>
            Cari Data
          </Button>
        </div>
      </div>
      <div className="border-b bg-background px-4 pb-4 pt-0">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari no faktur / pelanggan / no HP..."
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
            <div className="p-4 sm:p-6"><TableSkeleton cols={12} /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
              <img src={emptyIcon} alt="Tidak ada data" className="h-40 w-40 object-contain sm:h-64 sm:w-64" />
              <p className="text-lg font-semibold">Tidak Ada Data</p>
              <p className="text-sm">Tidak ada transaksi penjualan untuk rentang tanggal yang dipilih.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1560px] text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-sm font-semibold text-foreground">
                      <th className="px-5 py-3">Tanggal</th>
                      <th className="px-5 py-3">No Faktur</th>
                      <th className="px-5 py-3">Pelanggan</th>
                      <th className="px-5 py-3">Pesanan</th>
                      <th className="px-5 py-3 text-right">Qty</th>
                      <th className="px-5 py-3 text-right">Harga Jual / Meter</th>
                      <th className="px-5 py-3 text-right">Harga Total</th>
                      <th className="px-5 py-3 text-right">Tunai</th>
                      <th className="px-5 py-3 text-right">Transfer</th>
                      <th className="px-5 py-3 text-right">DP</th>
                      <th className="px-5 py-3 text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row, idx) => (
                      <tr key={`${row.no_faktur}-${idx}`} className="border-t hover:bg-muted/30">
                        <td className="px-5 py-4">{row.tanggal}</td>
                        <td className="px-5 py-4 font-medium">{row.no_faktur}</td>
                        <td className="px-5 py-4">{row.pelanggan}</td>
                        <td className="px-5 py-4">{row.pesanan}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatNumber(row.quantity)}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatIDR(row.harga_jual_per_meter)}</td>
                        <td className="px-5 py-4 text-right font-medium tabular-nums">{formatIDR(row.harga_total)}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatIDR(row.tunai)}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatIDR(row.transfer)}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatIDR(row.dp)}</td>
                        <td className="px-5 py-4 text-right tabular-nums">{formatIDR(row.sisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Menampilkan {fromItem}-{toItem} dari {totalItems} data</p>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="text-sm text-muted-foreground">Per halaman</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      const n = Number(v);
                      setLimit(n);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[92px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="h-10 w-10 p-0" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" className="h-10 w-10 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="flex h-10 min-w-[40px] items-center justify-center rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white">{page}</div>
                  <Button variant="outline" className="h-10 w-10 p-0" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" className="h-10 w-10 p-0" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>

        {submitted && !loading && (
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
        )}
      </div>
    </Card>
  );
}
