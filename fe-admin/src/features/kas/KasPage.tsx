import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Wallet, FileBarChart } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { kasService } from '@/services/kas.service';
import { CashEntry } from '@/types/order';
import { formatIDR, formatDate } from '@/utils/formatters';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const schema = z.object({
  type: z.enum(['PEMASUKAN', 'PENGELUARAN']),
  jumlah: z.coerce.number().min(1, 'Nominal tidak valid'),
  deskripsi: z.string().trim().min(1).max(200),
});
type FormData = z.infer<typeof schema>;

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export default function KasPage() {
  const [data, setData] = useState<CashEntry[]>([]);
  const [allCash, setAllCash] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PEMASUKAN' | 'PENGELUARAN'>('ALL');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const tooltipDataRef = useRef<{ name: string; value: number; color: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number; color: string } | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PEMASUKAN', jumlah: 0, deskripsi: '' },
  });

  const [jumlahDisplay, setJumlahDisplay] = useState('');
  const [deskripsiVal, setDeskripsiVal] = useState('');

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    setJumlahDisplay(num ? num.toLocaleString('id-ID') : '');
    setValue('jumlah', num, { shouldValidate: true });
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await kasService.getPaged({ page, limit, search, type: filter });
      if (Array.isArray(res)) {
        setData(res as CashEntry[]);
        setTotal((res as CashEntry[]).length);
        setTotalPages(1);
      } else {
        setData(res.items as CashEntry[]);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, page, limit, search]);
  useEffect(() => { kasService.getAll().then(setAllCash); }, []);
  useAutoRefresh(async () => {
    await Promise.all([load(true), kasService.getAll().then(setAllCash)]);
  }, { intervalMs: 10_000 });
  useEffect(() => { setPage(1); }, [search, limit]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number }>();
    allCash.forEach((c) => {
      const k = c.tanggal.slice(0, 10);
      const cur = map.get(k) ?? { date: k, income: 0, expense: 0 };
      if (c.type === 'PEMASUKAN') cur.income += c.jumlah;
      else cur.expense += c.jumlah;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, date: formatDate(d.date) }));
  }, [allCash]);

  const totals = useMemo(() => {
    const income = data.filter((d) => d.type === 'PEMASUKAN').reduce((s, d) => s + d.jumlah, 0);
    const expense = data.filter((d) => d.type === 'PENGELUARAN').reduce((s, d) => s + d.jumlah, 0);
    return { income, expense, balance: income - expense };
  }, [data]);

  const onSubmit = async (form: FormData) => {
    try { await kasService.create(form as Required<FormData>); toast.success('Dicatat'); setOpen(false); reset(); setJumlahDisplay(''); setDeskripsiVal(''); load(); }
    catch { toast.error('Gagal'); }
  };

  const fromItem = Math.min(total === 0 ? 0 : (page - 1) * limit + 1, total);
  const toItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Kas</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Select value={filter} onValueChange={(v) => setFilter(v as 'ALL' | 'PEMASUKAN' | 'PENGELUARAN')}>
                <SelectTrigger className="h-11 w-full bg-white sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="PEMASUKAN">Pemasukan</SelectItem>
                  <SelectItem value="PENGELUARAN">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => setOpen(true)} className="h-11 w-full px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />Catat Transaksi
              </Button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <EmptyState icon={Wallet} title="Belum ada catatan" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Tanggal</th>
                        <th className="px-5 py-4">Deskripsi</th>
                        <th className="px-5 py-4">Tipe</th>                      <th className="px-5 py-4">Dibuat Oleh</th>                        <th className="px-5 py-4 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((e) => (
                        <tr key={e._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 text-muted-foreground">{formatDate(e.tanggal)}</td>
                          <td className="px-5 py-5 font-medium">{e.deskripsi}</td>
                          <td className="px-5 py-5">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${e.type === 'PEMASUKAN' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                              {e.type === 'PEMASUKAN' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-muted-foreground">{e.created_by ?? '-'}</td>
                          <td className={`px-5 py-5 text-right font-semibold ${e.type === 'PEMASUKAN' ? 'text-success' : 'text-destructive'}`}>{e.type === 'PEMASUKAN' ? '+' : '-'} {formatIDR(e.jumlah)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">
                  Total data: {total}
                </div>

                <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Menampilkan {fromItem}-{toItem} dari {total} data
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>Per halaman</span>
                    <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                      <SelectTrigger className="h-10 w-24 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage(1)} disabled={page <= 1}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex h-10 min-w-10 items-center justify-center rounded-md bg-slate-800 px-3 font-semibold text-white">
                      {page}
                    </div>

                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-white">

            Arus Kas Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div
            ref={chartWrapperRef}
            className="relative h-[240px] sm:h-[300px]"
            onMouseMove={(e) => {
              if (!tooltipDataRef.current) return;
              const rect = chartWrapperRef.current!.getBoundingClientRect();
              setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, ...tooltipDataRef.current });
            }}
            onMouseLeave={() => { tooltipDataRef.current = null; setTooltip(null); }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Legend />
                <Bar dataKey="income" name="Masuk" fill="hsl(var(--success))" radius={[6, 6, 0, 0]}
                  onMouseEnter={(data: any) => { tooltipDataRef.current = { name: 'Masuk', value: data.income, color: 'hsl(var(--success))' }; }}
                  onMouseLeave={() => { tooltipDataRef.current = null; setTooltip(null); }}
                />
                <Bar dataKey="expense" name="Keluar" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]}
                  onMouseEnter={(data: any) => { tooltipDataRef.current = { name: 'Keluar', value: data.expense, color: 'hsl(var(--destructive))' }; }}
                  onMouseLeave={() => { tooltipDataRef.current = null; setTooltip(null); }}
                />
              </BarChart>
            </ResponsiveContainer>
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold shadow-md"
                style={{ left: tooltip.x, top: tooltip.y - 8, color: tooltip.color }}
              >
                {tooltip.name}: {formatIDR(tooltip.value)}
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm">
            <p className="rounded-md border border-success/30 bg-success/10 px-3 py-1 font-medium text-success">
              Masuk: {formatIDR(totals.income)}
            </p>
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 font-medium text-destructive">
              Keluar: {formatIDR(totals.expense)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Transaksi Kas</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as 'PEMASUKAN' | 'PENGELUARAN')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEMASUKAN">PEMASUKAN</SelectItem>
                    <SelectItem value="PENGELUARAN">PENGELUARAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal</Label>
              <Input
                inputMode="numeric"
                placeholder="Contoh: 15.000"
                value={jumlahDisplay}
                onChange={handleJumlahChange}
                onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
              />
              {errors.jumlah && <p className="text-xs text-destructive">{errors.jumlah.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input
                value={deskripsiVal}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setDeskripsiVal(upper);
                  setValue('deskripsi', upper, { shouldValidate: true });
                }}
                placeholder="DESKRIPSI TRANSAKSI"
              />
              {errors.deskripsi && <p className="text-xs text-destructive">{errors.deskripsi.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
