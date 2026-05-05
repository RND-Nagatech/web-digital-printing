import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Image as ImageIcon, Eye, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bannerService, bahanService } from '@/services/master.service';
import { Banner, Material } from '@/types/material';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export default function MasterBannerPage() {
  const [data, setData] = useState<Banner[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Banner | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [form, setForm] = useState<{ title: string; material_id: string; image?: File }>({ title: '', material_id: '' });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [bannersRes, mats] = await Promise.all([bannerService.getPaged({ page, limit, search }), bahanService.getAll()]);

      // handle bannersRes possibly being array or paged object
      if (Array.isArray(bannersRes)) {
        setData(bannersRes);
        setTotal(bannersRes.length);
        setTotalPages(1);
      } else if (bannersRes && typeof bannersRes === 'object') {
        setData(bannersRes.items || []);
        setTotal(bannersRes.meta?.total ?? bannersRes.items?.length ?? 0);
        setTotalPages(bannersRes.meta?.totalPages ?? 1);
      } else {
        setData([]);
        setTotal(0);
        setTotalPages(1);
      }

      setMaterials(mats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search]);

  useAutoRefresh(load, { intervalMs: 10_000 });

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Title wajib diisi'); return; }
    if (!form.material_id) { toast.error('Silakan pilih bahan'); return; }
    if (!form.image) { toast.error('Silakan pilih gambar'); return; }
    try {
      await bannerService.create(form);
      toast.success('Banner ditambahkan');
      setOpen(false);
      setForm({ title: '', material_id: '' });
      load();
    } catch {
      toast.error('Gagal');
    }
  };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="border-border-/70 overflow-hidden border shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Master Banner</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari banner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 bg-white pl-10"
              />
            </div>

            <Button onClick={() => setOpen(true)} className="gradient-primary h-11 px-6 text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Banner
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <TableSkeleton />
            ) : data.length === 0 ? (
              <EmptyState icon={ImageIcon} title="Belum ada data" />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Judul</th>
                        <th className="px-5 py-4">Bahan</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((b) => (
                        <tr key={b._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 font-semibold">{b.title ?? '-'}</td>
                          <td className="px-5 py-5">{b.material_name ?? '-'}</td>
                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setPreview(b)}>
                                <Eye className="mr-1 h-3.5 w-3.5" />Preview
                              </Button>
                              <Button size="icon" variant="ghost" onClick={async () => { await bannerService.delete(b._id); load(); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total Banner: {total}</div>

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
          <DialogHeader><DialogTitle>Tambah Banner</DialogTitle></DialogHeader>
          <DialogDescription>Isi data banner baru lalu klik Simpan untuk menambahkannya.</DialogDescription>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Bahan</Label>
              <Select value={form.material_id} onValueChange={(v) => setForm({ ...form, material_id: v })}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Pilih bahan" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Gambar</Label><Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} className="gradient-primary text-primary-foreground" disabled={!form.title.trim() || !form.material_id || !form.image}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!preview}
        onOpenChange={(o) => {
          if (!o) { setPreview(null); setZoom(1); setPan({ x: 0, y: 0 }); }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-[min(90vw,480px)] flex-col gap-0 overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{preview?.title ?? 'Preview Banner'}</p>
              <DialogDescription className="text-xs">Scroll atau pinch untuk zoom · Drag untuk geser</DialogDescription>
            </div>
            <div className="flex items-center gap-1 mr-8">
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                disabled={zoom <= 0.5}
              ><ZoomOut className="h-3.5 w-3.5" /></Button>
              <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(5, parseFloat((z + 0.25).toFixed(2))))}
                disabled={zoom >= 5}
              ><ZoomIn className="h-3.5 w-3.5" /></Button>
              <Button
                variant="outline" size="icon" className="h-7 w-7 ml-1"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              ><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Image viewport — fixed 3:4 ratio */}
          <div
            className="relative w-full overflow-hidden bg-muted/60"
            style={{ aspectRatio: '3 / 4', cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.15 : -0.15;
              setZoom((z) => Math.min(5, Math.max(0.5, parseFloat((z + delta).toFixed(2)))));
            }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              setIsDragging(true);
              dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
            }}
            onMouseMove={(e) => {
              if (!isDragging || !dragStart.current) return;
              setPan({
                x: dragStart.current.px + (e.clientX - dragStart.current.mx),
                y: dragStart.current.py + (e.clientY - dragStart.current.my),
              });
            }}
            onMouseUp={() => { setIsDragging(false); dragStart.current = null; }}
            onMouseLeave={() => { setIsDragging(false); dragStart.current = null; }}
          >
            {preview && (
              <img
                src={preview.image_url}
                alt={preview.title ?? 'banner'}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-100 select-none"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
