import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mataAyamService } from '@/services/master.service';
import { Eyelet } from '@/types/material';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const schema = z.object({ name: z.string().trim().min(2).max(100) });
type FormData = z.infer<typeof schema>;

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export default function MasterMataAyamPage() {
  const [data, setData] = useState<Eyelet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Eyelet | null>(null);
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
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await mataAyamService.getPaged({ page, limit, search });

      // API may return either a paged object { items, meta } or a plain array of items.
      if (Array.isArray(result)) {
        setData(result);
        setTotal(result.length);
        setTotalPages(1);
      } else if (result && typeof result === 'object') {
        setData(result.items || []);
        setTotal(result.meta?.total ?? result.items?.length ?? 0);
        setTotalPages(result.meta?.totalPages ?? 1);
      } else {
        setData([]);
        setTotal(0);
        setTotalPages(1);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  useAutoRefresh(() => load(true), { intervalMs: 10_000 });

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '' });
    setOpen(true);
  };

  const openEdit = (item: Eyelet) => {
    setEditing(item);
    reset({ name: item.name });
    setOpen(true);
  };

  const onSubmit = async (form: FormData) => {
    try {
      if (editing) {
        await mataAyamService.update(editing._id, form);
      } else {
        const created = await mataAyamService.create(form);
        if ('needs_reactivate' in created && created.needs_reactivate) {
          setPendingRestoreId(created.eyelet_id);
          setRestoreModalOpen(true);
          return;
        }
      }
      toast.success('Tersimpan');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    }
  };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Master Mata Ayam</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari mata ayam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 bg-white pl-10"
              />
            </div>

            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />
              Tambah
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <EmptyState icon={Eye} title="Belum ada data" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Nama</th>
                        <th className="px-5 py-4">Dibuat</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((m) => (
                        <tr key={m._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 font-semibold">{m.name}</td>
                          <td className="px-5 py-5 text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={async () => {
                                  await mataAyamService.delete(m._id);
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

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total Mata Ayam: {total}</div>

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

                    <div className="flex h-10 min-w-10 items-center justify-center rounded-md bg-slate-800 px-3 font-semibold text-white">{page}</div>

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Mata Ayam' : 'Tambah Mata Ayam'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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
                await mataAyamService.restore(pendingRestoreId);
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
    </div>
  );
}
