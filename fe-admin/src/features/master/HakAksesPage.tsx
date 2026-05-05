import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ROLES } from "@/utils/constants";
import { Role } from "@/types/user";
import { roleService } from "@/services/role.service";
import { useAuthStore } from "@/store/auth.store";

type RoleAccessRow = {
  id: string;
  role: Role;
  permissions: string[];
};

type AccessItem = {
  key: string;
  label: string;
  permissions: string[];
};

const ACCESS_SECTIONS: { title: string; items: AccessItem[] }[] = [
  {
    title: 'Master',
    items: [
      { key: 'master:bahan', label: 'Master Bahan', permissions: ['materials:read'] },
      { key: 'master:mata-ayam', label: 'Master Mata Ayam', permissions: ['eyelets:read'] },
      { key: 'master:banner', label: 'Master Banner', permissions: ['banners:read'] },
      { key: 'master:toko', label: 'Master Toko', permissions: ['stores:read'] },
      { key: 'master:user', label: 'Master User', permissions: ['users:read'] },
      { key: 'master:hak-akses', label: 'Hak Akses User', permissions: ['roles:read'] },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { key: 'transaksi', label: 'Transaksi', permissions: ['orders:read'] },
      { key: 'kas', label: 'Kas', permissions: ['cash:read'] },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { key: 'whatsapp:setting', label: 'Setting WhatsApp', permissions: ['whatsapp:send'] },
      { key: 'whatsapp:auto-reply', label: 'Auto Reply Rules', permissions: ['whatsapp:auto-reply'] },
    ],
  },
  {
    title: 'Laporan',
    items: [
      { key: 'laporan:keuangan', label: 'Laporan Keuangan', permissions: ['menu:laporan:keuangan', 'reports:read'] },
      { key: 'laporan:managerial', label: 'Laporan Managerial Bahan', permissions: ['menu:laporan:managerial', 'reports:read'] },
    ],
  },
];

const MANAGED_PERMISSION_KEYS = new Set(
  ACCESS_SECTIONS.flatMap((section) => section.items.flatMap((item) => item.permissions)),
);

const ROLE_ORDER: Role[] = ['owner', 'admin', 'kasir'];

export default function HakAksesPage() {
  const canUpdateRoles = useAuthStore((s) => s.hasPermission('roles:update'));

  const [roles, setRoles] = useState<RoleAccessRow[]>([]);
  const [perms, setPerms] = useState<Record<Role, string[]>>({ admin: [], owner: [], kasir: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const rows = await roleService.getAll();
        const normalized: RoleAccessRow[] = rows
          .map((row) => ({
            id: row._id,
            role: row.name as Role,
            permissions: row.permissions ?? [],
          }))
          .filter((row) => ROLE_ORDER.includes(row.role))
          .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

        const nextPerms: Record<Role, string[]> = { admin: [], owner: [], kasir: [] };
        normalized.forEach((row) => {
          nextPerms[row.role] = [...row.permissions];
        });

        setRoles(normalized);
        setPerms(nextPerms);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat hak akses';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const hasItemPermission = (role: Role, item: AccessItem) =>
    item.permissions.every((permission) => perms[role]?.includes(permission));

  const toggle = (role: Role, item: AccessItem) =>
    setPerms((current) => {
      const currentRolePermissions = new Set(current[role] ?? []);
      const enabled = item.permissions.every((permission) => currentRolePermissions.has(permission));

      if (enabled) {
        item.permissions.forEach((permission) => currentRolePermissions.delete(permission));
      } else {
        item.permissions.forEach((permission) => currentRolePermissions.add(permission));
      }

      const hasLaporanMenu =
        currentRolePermissions.has('menu:laporan:keuangan') ||
        currentRolePermissions.has('menu:laporan:managerial');

      if (!hasLaporanMenu) {
        currentRolePermissions.delete('reports:read');
      }

      return {
        ...current,
        [role]: Array.from(currentRolePermissions),
      };
    });

  const visibleSections = useMemo(
    () => ACCESS_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(search.toLowerCase()) ||
            item.key.toLowerCase().includes(search.toLowerCase()),
        ),
      }))
      .filter((section) => section.items.length > 0),
    [search],
  );

  const save = async () => {
    if (!canUpdateRoles) {
      toast.error('Anda tidak memiliki izin untuk mengubah hak akses');
      return;
    }

    try {
      setSaving(true);

      await Promise.all(
        roles.map(async (row) => {
          const selected = new Set(perms[row.role] ?? []);
          const preserved = (row.permissions ?? []).filter((permission) => !MANAGED_PERMISSION_KEYS.has(permission));
          const managed = Array.from(selected).filter((permission) => MANAGED_PERMISSION_KEYS.has(permission));
          const merged = Array.from(new Set([...preserved, ...managed]));

          const before = JSON.stringify((row.permissions ?? []).slice().sort());
          const after = JSON.stringify(merged.slice().sort());
          if (before === after) return;

          await roleService.update(row.id, { permissions: merged });
        }),
      );

      const refreshed = await roleService.getAll();
      const normalized: RoleAccessRow[] = refreshed
        .map((row) => ({ id: row._id, role: row.name as Role, permissions: row.permissions ?? [] }))
        .filter((row) => ROLE_ORDER.includes(row.role))
        .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

      const nextPerms: Record<Role, string[]> = { admin: [], owner: [], kasir: [] };
      normalized.forEach((row) => {
        nextPerms[row.role] = [...row.permissions];
      });

      setRoles(normalized);
      setPerms(nextPerms);
      toast.success('Hak akses berhasil disimpan');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan hak akses';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const visibleRoles = useMemo(
    () => ROLE_ORDER.filter((role) => roles.some((row) => row.role === role)),
    [roles],
  );

  const defaultRole = visibleRoles[0] ?? 'owner';

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Hak Akses User</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari menu atau role..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 bg-white pl-10" />
            </div>

            <Button
              onClick={() => void save()}
              disabled={loading || saving || !canUpdateRoles}
              className="h-11 px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto rounded-md border pb-4">
              <Tabs defaultValue={defaultRole}>
                <TabsList className="flex gap-2 p-1 bg-muted/40 rounded-md">
                  {ROLES
                    .filter((r) => visibleRoles.includes(r.value as Role))
                    .filter((r) => r.label.toLowerCase().includes(search.toLowerCase()) || r.value.toLowerCase().includes(search.toLowerCase()))
                    .map((r) => (
                      <TabsTrigger
                        key={r.value}
                        value={r.value}
                        className="flex-1 relative rounded-md pl-6 pr-4 py-2 text-sm font-medium before:absolute before:inset-y-2 before:left-0 before:w-1.5 before:rounded-l-lg before:bg-muted-foreground/20 data-[state=active]:before:bg-primary data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        {r.label}
                      </TabsTrigger>
                    ))}
                </TabsList>

                {ROLES.filter((r) => visibleRoles.includes(r.value as Role)).map((r) => (
                  <TabsContent key={r.value} value={r.value} className="mt-4">
                    <div className="space-y-4">
                      {loading && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat hak akses...
                        </div>
                      )}

                      {!loading && visibleSections.map((section) => (
                        <div key={section.title}>
                          <p className="mb-2 text-sm font-semibold text-muted-foreground">{section.title}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {section.items.map((item) => {
                              const checked = hasItemPermission(r.value as Role, item);
                              return (
                                <label key={item.key} className="flex items-stretch gap-3 rounded-lg border border-border bg-card p-0 cursor-pointer hover:border-primary transition-base overflow-hidden">
                                  <span className={`${checked ? 'bg-primary' : 'bg-muted-foreground/20'} w-1.5 self-stretch rounded-l-lg`} />
                                  <div className="flex items-center gap-3 px-4 py-3 w-full">
                                    <Checkbox
                                      checked={checked}
                                      disabled={loading || saving || !canUpdateRoles}
                                      onCheckedChange={() => toggle(r.value as Role, item)}
                                    />
                                    <span className="text-sm font-medium">{item.label}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {!loading && !visibleSections.length && (
                        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada menu yang cocok dengan pencarian.</p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <div className="border-t bg-muted/30 px-5 py-4 text-sm font-medium">
              Total submenu yang diatur: {ACCESS_SECTIONS.reduce((acc, section) => acc + section.items.length, 0)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
