import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, MessageSquare, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { whatsappService } from '@/services/whatsapp.service';
import { AutoReplyRule } from '@/types/order';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const schema = z.object({
  keyword: z.string().trim().min(1, 'Kata kunci wajib diisi').max(100),
  reply: z.string().trim().min(1, 'Balasan wajib diisi').max(1000),
  active: z.boolean(),
  matchType: z.enum(['contains', 'exact']),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export default function AutoReplyPage() {
  const [items, setItems] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AutoReplyRule | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { keyword: '', reply: '', active: true, matchType: 'contains' },
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await whatsappService.getPaged({ page, limit, search: query });
      setItems(res.items || []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, query]);

  useAutoRefresh(load, { intervalMs: 10_000 });

  useEffect(() => {
    setPage(1);
  }, [limit, query]);

  const openCreate = () => {
    setEditing(null);
    reset({ keyword: '', reply: '', active: true, matchType: 'contains' });
    setOpen(true);
  };

  const openEdit = (item: AutoReplyRule) => {
    setEditing(item);
    reset({
      keyword: item.keyword,
      reply: item.reply,
      active: item.active,
      matchType: item.matchType ?? 'contains',
    });
    setOpen(true);
  };

  const onSubmit = async (form: FormData) => {
    try {
      if (editing) {
        await whatsappService.updateRule(editing.id, form);
      } else {
        await whatsappService.createRule(form);
      }
      toast.success('Rule tersimpan');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan rule');
    }
  };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Auto Reply Rules</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari keyword atau balasan..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />Tambah Rule
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Belum ada rule" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Tipe</th>
                        <th className="px-5 py-4">Keyword</th>
                        <th className="px-5 py-4">Balasan</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 font-semibold">{r.matchType === 'exact' ? 'EXACT' : 'CONTAINS'}</td>
                          <td className="px-5 py-5 text-muted-foreground">{r.keyword}</td>
                          <td className="px-5 py-5"><p className="line-clamp-2">{r.reply}</p></td>
                          <td className="px-5 py-5">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${r.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                              {r.active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={async () => { await whatsappService.deleteRule(r.id); load(); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total Rules: {total}</div>

                <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>Menampilkan {fromItem}-{toItem} dari {total} data</p>

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
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Auto Reply</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Kata Kunci</Label>
              <Input {...register('keyword')} />
              {errors.keyword && <p className="text-xs text-destructive">{errors.keyword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tipe Pencocokan</Label>
              <Select value={watch('matchType')} onValueChange={(v) => setValue('matchType', v as 'exact' | 'contains')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Mengandung</SelectItem>
                  <SelectItem value="exact">Sama Persis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Balasan</Label>
              <Textarea
                rows={4}
                {...register('reply')}
                className="border border-input focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {errors.reply && <p className="text-xs text-destructive">{errors.reply.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={watch('active')} onCheckedChange={(v) => setValue('active', v)} />
              <Label>Aktif</Label>
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
