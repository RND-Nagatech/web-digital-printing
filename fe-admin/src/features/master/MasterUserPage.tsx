import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userService } from "@/services/user.service";
import { User, Role } from "@/types/user";
import { ROLES } from "@/utils/constants";
import { formatDate } from "@/utils/formatters";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "owner", "kasir"]),
  active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function MasterUserPage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'kasir', active: true } });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await userService.getPaged({ page, limit, search });
      if (Array.isArray(res)) {
        setData(res as User[]);
        setTotal((res as User[]).length);
        setTotalPages(1);
      } else if (res && typeof res === 'object' && 'items' in res) {
        setData(res.items || []);
        setTotal(res.meta?.total ?? res.items?.length ?? 0);
        setTotalPages(res.meta?.totalPages ?? 1);
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

  useEffect(() => { setPage(1); }, [search, limit]);

  const openCreate = () => { setEditing(null); reset({ name: '', email: '', role: 'kasir', active: true }); setOpen(true); };
  const openEdit = (u: User) => { setEditing(u); reset({ name: u.name, email: u.email, role: u.role, active: u.active }); setOpen(true); };

  const onSubmit = async (form: FormData) => {
    try {
      if (editing) await userService.update(editing.id, form);
      else await userService.create(form as Omit<User, 'id' | 'createdAt'>);
      toast.success('Tersimpan'); setOpen(false); load();
    } catch { toast.error('Gagal'); }
  };

  const onDelete = async (id: string) => { await userService.delete(id); toast.success('Dihapus'); load(); };

  const fromItem = useMemo(() => (total === 0 ? 0 : (page - 1) * limit + 1), [page, limit, total]);
  const toItem = useMemo(() => Math.min(page * limit, total), [page, limit, total]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Master User</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari user..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <Button onClick={openCreate} className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
              <Plus className="mr-2 h-4 w-4" />Tambah User
            </Button>
          </div>

          <div className="p-6">
            {loading ? <TableSkeleton /> : data.length === 0 ? <EmptyState icon={Users} title="Belum ada user" /> : (
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">User</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Bergabung</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((u) => (
                        <tr key={u.id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">{u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                              <div><p className="font-medium leading-tight">{u.name}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-muted-foreground">{u.email}</td>
                          <td className="px-5 py-5"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{u.role}</span></td>
                          <td className="px-5 py-5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                          <td className="px-5 py-5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{u.active ? 'Aktif' : 'Nonaktif'}</span></td>
                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => onDelete(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">Total User: {total}</div>

                <div className="flex flex-col gap-3 border-t bg-background px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>Menampilkan {fromItem}-{toItem} dari {total} data</p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>Per halaman</span>
                    <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
                      <SelectTrigger className="h-10 w-24 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{['10', '20', '50'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
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
            <DialogTitle>{editing ? 'Edit' : 'Tambah'} User</DialogTitle>
            <DialogDescription>Lengkapi data user dan simpan perubahan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                {...register('name')}
                className="uppercase"
                onChange={(e) => setValue('name', e.target.value.toUpperCase())}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register('email')} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={watch('active')} onCheckedChange={(v) => setValue('active', v)} /><Label>Aktif</Label></div>
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
