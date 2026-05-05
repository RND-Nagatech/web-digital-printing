import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, MessageCircle, Plus, Receipt, AlertTriangle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Order, OrderStatus } from '@/types/order';
import { ORDER_STATUSES } from '@/utils/constants';
import { formatIDR, formatDateTime } from '@/utils/formatters';
import { OrderDetailDialog } from './OrderDetailDialog';
import reprintIcon from '@/assets/reprint_icon.png';
import lunasIcon from '@/assets/lunas_icon.png';
import belumLunasIcon from '@/assets/belum_lunas_icon.png';
import ngtcLogo from '@/assets/NGTC.png';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState(todayValue);
  const [appliedDate, setAppliedDate] = useState(todayValue);
  const [selected, setSelected] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [materialNameByCode, setMaterialNameByCode] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const result = await transaksiService.getPaged({ page, limit, search, status, date: appliedDate });
      setData(result.items as Order[]);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal memuat'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, search, status, appliedDate]);
  useEffect(() => { setPage(1); }, [search, status, limit, appliedDate]);
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

  const sendWA = (o: Order) => {
    const phone = o.no_hp.replace(/^0/, '62').replace(/\D/g, '');
    const msg = encodeURIComponent(`Halo ${o.nama_customer}, pesanan ${o.no_faktur} total ${formatIDR(o.harga_total)}.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
  };

  const handleApplyDateFilter = () => {
    setAppliedDate(dateFilter || todayValue);
    setPage(1);
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
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari kode order, pelanggan, nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-11 w-full bg-white sm:w-48"
              />

              <Button onClick={handleApplyDateFilter} className="h-11 w-full px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto">
                Cari Data
              </Button>

              <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | 'all')}>
                <SelectTrigger className="h-11 w-full bg-white sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button onClick={() => navigate('/transaksi/baru')} className="h-11 w-full px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />Transaksi Baru
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? <TableSkeleton /> : data.length === 0 ? <EmptyState icon={Receipt} title="Tidak ada transaksi" /> : (
              <div className="overflow-hidden rounded-md border">
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
                              <Button size="icon" variant="ghost" onClick={() => sendWA(o)} title="Follow up WhatsApp">
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
        </CardContent>
      </Card>

      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} onUpdated={load} />
    </div>
  );
}
