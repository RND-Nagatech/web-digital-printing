import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ruler, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sizeService } from '@/services/master.service';
import { SizePreset } from '@/types/material';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export default function MasterUkuranPage() {
  const [data, setData] = useState<SizePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SizePreset | null>(null);
  const [form, setForm] = useState({
    kode_ukuran: '',
    nama_ukuran: '',
    deskripsi: '',
    satuan: 'CM' as 'CM' | 'M',
    panjang_cm: '',
    lebar_cm: '',
    is_active: true,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await sizeService.getPaged({ page, limit, search });
      setData(res.items || []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat data ukuran');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, search]);
  useAutoRefresh(() => load(true), { intervalMs: 10_000 });
  useEffect(() => { setPage(1); }, [search, limit]);

  const resetForm = () => setForm({
    kode_ukuran: '',
    nama_ukuran: '',
    deskripsi: '',
    satuan: 'CM',
    panjang_cm: '',
    lebar_cm: '',
    is_active: true,
  });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: SizePreset) => {
    setEditing(row);
    setForm({
      kode_ukuran: row.kode_ukuran,
      nama_ukuran: row.nama_ukuran,
      deskripsi: row.deskripsi ?? '',
      satuan: row.satuan ?? 'CM',
      panjang_cm: String((row.satuan ?? 'CM') === 'M' ? Number((row.panjang_cm / 100).toFixed(4)) : row.panjang_cm),
      lebar_cm: String((row.satuan ?? 'CM') === 'M' ? Number((row.lebar_cm / 100).toFixed(4)) : row.lebar_cm),
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      kode_ukuran: form.kode_ukuran.trim().toUpperCase(),
      nama_ukuran: form.nama_ukuran.trim().toUpperCase(),
      deskripsi: form.deskripsi.trim().toUpperCase(),
      satuan: form.satuan,
      panjang_cm: Number(form.panjang_cm),
      lebar_cm: Number(form.lebar_cm),
      is_active: form.is_active,
    };

    if (!payload.kode_ukuran || !payload.nama_ukuran || payload.panjang_cm <= 0 || payload.lebar_cm <= 0) {
      toast.error('Lengkapi semua data ukuran dengan benar');
      return;
    }

    try {
      if (editing) {
        await sizeService.update(editing._id, payload);
        toast.success('Ukuran berhasil diupdate');
      } else {
        await sizeService.create(payload);
        toast.success('Ukuran berhasil ditambahkan');
      }
      setOpen(false);
      resetForm();
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan ukuran');
    }
  };

  const remove = async (row: SizePreset) => {
    try {
      await sizeService.delete(row._id);
      toast.success('Ukuran berhasil dihapus');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus ukuran');
    }
  };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Master Ukuran</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari ukuran..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />Tambah Ukuran
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <EmptyState icon={Ruler} title="Belum ada data" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Kode</th>
                        <th className="px-5 py-4">Nama</th>
                        <th className="px-5 py-4">Deskripsi</th>
                        <th className="px-5 py-4">Panjang</th>
                        <th className="px-5 py-4">Lebar</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-4 font-semibold">{row.kode_ukuran}</td>
                          <td className="px-5 py-4">{row.nama_ukuran}</td>
                          <td className="px-5 py-4">{row.deskripsi || '-'}</td>
                          <td className="px-5 py-4">{(row.satuan ?? 'CM') === 'M' ? Number((row.panjang_cm / 100).toFixed(4)) : row.panjang_cm} {(row.satuan ?? 'CM').toLowerCase()}</td>
                          <td className="px-5 py-4">{(row.satuan ?? 'CM') === 'M' ? Number((row.lebar_cm / 100).toFixed(4)) : row.lebar_cm} {(row.satuan ?? 'CM').toLowerCase()}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {row.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total Ukuran: {total}</div>

                <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>Menampilkan {fromItem}-{toItem} dari {total} data</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>Per halaman</span>
                    <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                      <SelectTrigger className="h-10 w-24 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Ukuran' : 'Tambah Ukuran'}</DialogTitle>
            <DialogDescription>Isi data ukuran standar yang ingin digunakan customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kode</Label><Input value={form.kode_ukuran} onChange={(e) => setForm((s) => ({ ...s, kode_ukuran: e.target.value.toUpperCase() }))} /></div>
              <div className="space-y-1.5"><Label>Nama</Label><Input value={form.nama_ukuran} onChange={(e) => setForm((s) => ({ ...s, nama_ukuran: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Textarea rows={3} value={form.deskripsi} onChange={(e) => setForm((s) => ({ ...s, deskripsi: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Satuan Input</Label>
              <Select value={form.satuan} onValueChange={(value: 'CM' | 'M') => setForm((s) => ({ ...s, satuan: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CM">CM</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Panjang ({form.satuan.toLowerCase()})</Label><Input inputMode="decimal" value={form.panjang_cm} onChange={(e) => setForm((s) => ({ ...s, panjang_cm: e.target.value.replace(/[^0-9.]/g, '') }))} /></div>
              <div className="space-y-1.5"><Label>Lebar ({form.satuan.toLowerCase()})</Label><Input inputMode="decimal" value={form.lebar_cm} onChange={(e) => setForm((s) => ({ ...s, lebar_cm: e.target.value.replace(/[^0-9.]/g, '') }))} /></div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Status Aktif</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((s) => ({ ...s, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} className="gradient-primary text-primary-foreground">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
