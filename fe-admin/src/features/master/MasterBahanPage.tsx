import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { bahanService } from '@/services/master.service';
import { Material } from '@/types/material';
import { formatIDR } from '@/utils/formatters';
import { MaterialNeedsReactivateDto } from '@/types/dto/materials.dto';

const schema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(2).max(100),
  description: z.string().optional(),
  price_per_meter: z.coerce.number().min(0),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;
const formatRupiahInput = (value: number) => new Intl.NumberFormat('id-ID').format(Number.isFinite(value) ? value : 0);
const parseRupiahInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export default function MasterBahanPage() {
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const load = async () => {
    setLoading(true);
    try {
      const result = await bahanService.getPaged({ page, limit, search });
      setData(result.items);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const openCreate = () => {
    setEditing(null);
    reset({ code: '', name: '', description: '', price_per_meter: 0, is_active: true });
    setOpen(true);
  };

  const openEdit = (item: Material) => {
    setEditing(item);
    reset(item);
    setOpen(true);
  };

  const onSubmit = async (form: FormData) => {
    try {
      if (editing) {
        await bahanService.update(editing._id, form);
      } else {
        const created = await bahanService.create(form as Omit<Material, '_id' | 'created_at'>);
        if ('needs_reactivate' in created && (created as MaterialNeedsReactivateDto).needs_reactivate) {
          setPendingRestoreId((created as MaterialNeedsReactivateDto).material_id);
          setRestoreModalOpen(true);
          return;
        }
      }
      toast.success('Tersimpan');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    }
  };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Master Bahan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 bg-white pl-10"
              />
            </div>

            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Bahan
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <EmptyState icon={Package} title="Belum ada data" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Kode</th>
                        <th className="px-5 py-4">Nama</th>
                        <th className="px-5 py-4">Harga / m2</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((m) => (
                        <tr key={m._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 text-muted-foreground">{m.code}</td>
                          <td className="px-5 py-5 font-semibold">{m.name}</td>
                          <td className="px-5 py-5">{formatIDR(m.price_per_meter)}</td>
                          <td className="px-5 py-5">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${m.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                }`}
                            >
                              {m.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={async () => {
                                  await bahanService.delete(m._id);
                                  load();
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">
                  Total Produk: {total}
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
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
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
        </CardContent >
      </Card >

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Bahan' : 'Tambah Bahan'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input
                  {...register('code')}
                  disabled={Boolean(editing)}
                  className="uppercase"
                  onChange={(e) => setValue('code', e.target.value.toUpperCase())}
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Nama Bahan</Label>
                <Input
                  {...register('name')}
                  className="uppercase"
                  onChange={(e) => setValue('name', e.target.value.toUpperCase())}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Deskripsi</Label>
                <Textarea
                  {...register('description')}
                  rows={4}
                  className="min-h-[120px] resize-y uppercase"
                  onChange={(e) => setValue('description', e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Harga / m2</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="pl-10"
                    value={formatRupiahInput(watch('price_per_meter') || 0)}
                    onChange={(e) => setValue('price_per_meter', parseRupiahInput(e.target.value), { shouldValidate: true })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                <Switch checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
                <Label>Aktifkan bahan</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aktifkan Kembali Data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Data ini sudah ada dalam status terhapus. Apakah Anda ingin mengaktifkannya kembali?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRestoreModalOpen(false);
                setPendingRestoreId(null);
                toast.info('Aktivasi dibatalkan');
              }}
            >
              Tidak
            </Button>
            <Button
              type="button"
              className="gradient-primary text-primary-foreground"
              onClick={async () => {
                if (!pendingRestoreId) return;
                await bahanService.restore(pendingRestoreId);
                setRestoreModalOpen(false);
                setPendingRestoreId(null);
                toast.success('Data berhasil diaktifkan kembali');
                load();
              }}
            >
              Ya, Aktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
