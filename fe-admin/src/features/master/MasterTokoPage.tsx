import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Building2, Plus, Search, Pencil, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storeService } from '@/services/store.service';
import { Store } from '@/types/store';
import { formatDateTime } from '@/utils/formatters';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

const PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

const schema = z.object({
    nama_toko: z.string().trim().min(2).max(120),
    no_hp: z.string().trim().min(6).max(30),
    alamat: z.string().trim().min(5).max(300),
});

type FormData = z.infer<typeof schema>;

export default function MasterTokoPage() {
    const [data, setData] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [hasAnyStore, setHasAnyStore] = useState(false);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Store | null>(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [res, allStoreMeta] = await Promise.all([
                storeService.getPaged({ page, limit, search }),
                storeService.getPaged({ page: 1, limit: 1 }),
            ]);
            setData(res.items || []);
            setTotal(res.meta?.total ?? 0);
            setTotalPages(res.meta?.totalPages ?? 1);
            setHasAnyStore((allStoreMeta.meta?.total ?? 0) > 0);
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
        reset({ nama_toko: '', no_hp: '', alamat: '' });
        setOpen(true);
    };

    const openEdit = (row: Store) => {
        setEditing(row);
        reset({ nama_toko: row.nama_toko, no_hp: row.no_hp, alamat: row.alamat });
        setOpen(true);
    };

    const onSubmit = async (form: FormData) => {
        try {
            if (editing) {
                await storeService.update(editing._id, form);
            } else {
                await storeService.create(form);
            }
            toast.success('Data toko tersimpan');
            setOpen(false);
            load();
        } catch {
            toast.error('Gagal menyimpan toko');
        }
    };

    const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
    const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border border-border/70 shadow-card">
                <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
                    <CardTitle className="text-xl font-semibold text-white">Master Toko</CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari toko..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-11 bg-white pl-10"
                            />
                        </div>

                        {!hasAnyStore && (
                            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                                <Plus className="mr-2 h-4 w-4" />Tambah Toko
                            </Button>
                        )}
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <TableSkeleton />
                        ) : data.length === 0 ? (
                            <EmptyState icon={Building2} title="Belum ada data toko" />
                        ) : (
                            <div className="overflow-hidden rounded-md border">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[820px] text-sm">
                                        <thead className="bg-muted/40">
                                            <tr className="text-left text-base font-semibold text-foreground">
                                                <th className="px-5 py-4">Kode</th>
                                                <th className="px-5 py-4">Nama Toko</th>
                                                <th className="px-5 py-4">No HP</th>
                                                <th className="px-5 py-4">Alamat</th>
                                                <th className="px-5 py-4">Created</th>
                                                <th className="px-5 py-4 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((row) => (
                                                <tr key={row._id} className="border-t hover:bg-muted/30">
                                                    <td className="px-5 py-5 font-semibold">{row.kode_toko}</td>
                                                    <td className="px-5 py-5 font-medium">{row.nama_toko}</td>
                                                    <td className="px-5 py-5 text-muted-foreground">{row.no_hp}</td>
                                                    <td className="px-5 py-5 text-muted-foreground">{row.alamat}</td>
                                                    <td className="px-5 py-5 text-muted-foreground">{formatDateTime(row.created_at)}</td>
                                                    <td className="px-5 py-5">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total Toko: {total}</div>

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
                        <DialogTitle>{editing ? 'Edit' : 'Tambah'} Toko</DialogTitle>
                        <DialogDescription>Lengkapi data toko untuk digunakan sebagai header laporan.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Nama Toko</Label>
                            <Input {...register('nama_toko')} className="uppercase" />
                            {errors.nama_toko && <p className="text-xs text-destructive">{errors.nama_toko.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>No HP</Label>
                            <Input {...register('no_hp')} />
                            {errors.no_hp && <p className="text-xs text-destructive">{errors.no_hp.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Alamat</Label>
                            <Input {...register('alamat')} className="uppercase" />
                            {errors.alamat && <p className="text-xs text-destructive">{errors.alamat.message}</p>}
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
