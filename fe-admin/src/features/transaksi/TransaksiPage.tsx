import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, MessageCircle, Receipt, AlertTriangle, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { transaksiService } from '@/services/transaksi.service';
import { storeService } from '@/services/store.service';
import { bahanService } from '@/services/master.service';
import { Order, OrderStatus, PaymentStatus } from '@/types/order';
import { ORDER_STATUSES } from '@/utils/constants';
import { formatIDR, formatDateTime } from '@/utils/formatters';
import { OrderDetailDialog } from './OrderDetailDialog';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import reprintIcon from '@/assets/reprint_icon.png';
import lunasIcon from '@/assets/lunas_icon.png';
import belumLunasIcon from '@/assets/belum_lunas_icon.png';
import ngtcLogo from '@/assets/NGTC.png';
import cariDataIcon from '@/assets/cari-data.svg';

type NotaPdfModule = typeof import('./nota-pdf');
let notaPdfModulePromise: Promise<NotaPdfModule> | null = null;
const getNotaPdfModule = (): Promise<NotaPdfModule> => {
  if (!notaPdfModulePromise) notaPdfModulePromise = import('./nota-pdf');
  return notaPdfModulePromise;
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

const getTodayDateInputValue = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TransaksiPage() {
  const todayValue = getTodayDateInputValue();
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  // Default tampilkan data transaksi hari ini saat halaman pertama kali dibuka.
  // Untuk tanggal lain tetap harus klik "Cari Data" agar filter diterapkan.
  const [submitted, setSubmitted] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState(todayValue);
  const [endDateFilter, setEndDateFilter] = useState(todayValue);
  const [searchFilter, setSearchFilter] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<OrderStatus | 'all'>('all');
  const [appliedPayment, setAppliedPayment] = useState<PaymentStatus | 'all'>('all');
  const [appliedStartDate, setAppliedStartDate] = useState(todayValue);
  const [appliedEndDate, setAppliedEndDate] = useState(todayValue);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [materialNameByCode, setMaterialNameByCode] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await transaksiService.getPaged({
        page,
        limit,
        status: appliedStatus,
        payment_status: appliedPayment,
        search: appliedSearch.trim() || undefined,
        date_start: appliedStartDate,
        date_end: appliedEndDate,
      });
      setData(result.items as Order[]);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal memuat'); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    if (!submitted) return;
    load();
    // eslint-disable-next-line
  }, [page, limit, appliedStatus, appliedPayment, appliedStartDate, appliedEndDate, appliedSearch, reloadKey, submitted]);

  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      setAppliedSearch(searchFilter);
      setPage(1);
      setReloadKey((x) => x + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchFilter, submitted]);
  useAutoRefresh(() => load(true), { intervalMs: 10_000, enabled: submitted });
  useEffect(() => { setPage(1); }, [limit, appliedStatus, appliedPayment, appliedStartDate, appliedEndDate]);
  useEffect(() => {
    void bahanService.getAll().then((materials) => {
      const mapped = materials.reduce<Record<string, string>>((acc, material) => {
        acc[material.code] = material.name;
        return acc;
      }, {});
      setMaterialNameByCode(mapped);
    }).catch(() => {
      setMaterialNameByCode({});
    });
  }, []);

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  const sendWA = async (o: Order) => {
    try {
      const phone = o.no_hp.replace(/^0/, '62').replace(/\D/g, '');
      const result = await transaksiService.getFollowUpMessage(o._id);
      const msg = encodeURIComponent(result.message);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
    } catch {
      const phone = o.no_hp.replace(/^0/, '62').replace(/\D/g, '');
      const fallback = encodeURIComponent(`Halo ${o.nama_customer}, pesanan ${o.no_faktur} total ${formatIDR(o.harga_total)}.`);
      window.open(`https://wa.me/${phone}?text=${fallback}`, '_blank', 'noopener');
      toast.error('Template follow-up dinamis gagal dimuat, menggunakan pesan default.');
    }
  };

  const handleApplyFilter = () => {
    if (!startDateFilter || !endDateFilter) {
      toast.error('Tanggal awal dan tanggal akhir wajib diisi');
      return;
    }
    if (new Date(startDateFilter).getTime() > new Date(endDateFilter).getTime()) {
      toast.error('Tanggal awal tidak boleh lebih besar dari tanggal akhir');
      return;
    }
    setAppliedStartDate(startDateFilter);
    setAppliedEndDate(endDateFilter);
    setAppliedStatus(statusFilter);
    setAppliedPayment(paymentFilter);
    setAppliedSearch(searchFilter);
    setPage(1);
    setSubmitted(true);
    setReloadKey((x) => x + 1);
  };

  const handleReprintNota = async (order: Order) => {
    try {
      const notaPdf = await getNotaPdfModule();
      const [store, logoDataUrl, lunasDataUrl, belumLunasDataUrl] = await Promise.all([
        storeService.getReportHeader(),
        notaPdf.loadImageAsDataUrl(ngtcLogo),
        notaPdf.loadImageAsDataUrl(lunasIcon),
        notaPdf.loadImageAsDataUrl(belumLunasIcon),
      ]);
      const watermarkDataUrl = order.payment_status === 'paid' ? lunasDataUrl : belumLunasDataUrl;
      notaPdf.downloadOrderNotaPdf({
        order,
        store,
        logoDataUrl,
        watermarkDataUrl,
        materialName: materialNameByCode[order.kode_bahan] ?? order.kode_bahan,
      });
      toast.success('Nota berhasil diunduh');
    } catch {
      toast.error('Gagal mencetak nota');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Data Transaksi</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <Input
                type="date"
                value={startDateFilter}
                max={endDateFilter || undefined}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="h-11 w-full bg-white"
              />
              <Input
                type="date"
                value={endDateFilter}
                min={startDateFilter || undefined}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="h-11 w-full bg-white"
              />

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
                <SelectTrigger className="h-11 w-full bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentStatus | 'all')}>
                <SelectTrigger className="h-11 w-full bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pembayaran</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="unpaid">Belum Lunas</SelectItem>
                  <SelectItem value="dp">DP</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleApplyFilter} disabled={loading} className="h-11 w-full px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                Cari Data
              </Button>
            </div>
          </div>
          <div className="border-b bg-background px-6 pb-5 pt-4">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyFilter();
                  }
                }}
                className="h-11 bg-white pl-10"
                placeholder="Cari no faktur / pelanggan / no HP..."
              />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="border border-border bg-muted/20">
              {!submitted ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-muted-foreground">
                  <img src={cariDataIcon} alt="Cari data transaksi" className="h-40 w-40 object-contain sm:h-64 sm:w-64" />
                  <p>Silahkan tentukan filter dan klik <strong>Cari Data</strong> untuk menampilkan data.</p>
                </div>
              ) : loading ? (
                <div className="p-4 sm:p-6"><TableSkeleton /></div>
              ) : data.length === 0 ? (
                <EmptyState icon={Receipt} title="Tidak ada transaksi" />
              ) : (
              <div className="overflow-hidden rounded-md border m-4 sm:m-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground"><th className="px-5 py-4">Kode</th><th className="px-5 py-4">Tanggal</th><th className="px-5 py-4">Pelanggan</th><th className="px-5 py-4">Pembayaran</th><th className="px-5 py-4">Pengerjaan</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4 text-right">Aksi</th></tr>
                    </thead>
                    <tbody>
                      {data.map((o) => (
                        <tr key={o._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 font-medium">{o.no_faktur}</td>
                          <td className="px-5 py-5 text-muted-foreground text-xs">{formatDateTime(o.created_at)}</td>
                          <td className="px-5 py-5"><p className="font-medium">{o.nama_customer}</p><p className="text-xs text-muted-foreground">{o.no_hp}</p></td>
                          <td className="px-5 py-5">
                            <div className="flex flex-col gap-1.5">
                              <PaymentBadge status={o.payment_status} />
                              {o.payment_status === 'dp' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  Sisa {formatIDR(o.sisa ?? 0)}
                                </span>
                              )}
                              {o.payment_status !== 'paid' && !['open', 'cancelled'].includes(o.status) && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  <AlertTriangle className="h-3 w-3" /> Belum Lunas
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="px-5 py-5 text-right font-semibold">{formatIDR(o.harga_total)}</td>
                          <td className="px-5 py-5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setSelected(o)} title="Detail">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { void sendWA(o); }} title="Follow up WhatsApp">
                                <MessageCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { void handleReprintNota(o); }} title="Reprint nota">
                                <img src={reprintIcon} alt="Reprint nota" className="h-4 w-4 object-contain" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">
                  Total Transaksi: {total}
                </div>

                <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>Menampilkan {fromItem}-{toItem} dari {total} data</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>Per halaman</span>
                    <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                      <SelectTrigger className="h-10 w-24 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex h-10 min-w-10 items-center justify-center rounded-md bg-slate-800 px-3 font-semibold text-white">{page}</div>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} onUpdated={load} />
    </div>
  );
}
