import { Bell, KeyRound, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";

export const Topbar = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleChangePassword = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
      toast.error("Semua field password wajib diisi");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      toast.error("Retype password baru tidak sama");
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(form);

      localStorage.removeItem("admin-remember-credentials");
      await handleLogout();

      toast.success("Password berhasil diganti. Silakan login ulang dengan password baru.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal ganti password");
    } finally {
      setSaving(false);
      setIsChangePasswordOpen(false);
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    }
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold leading-tight">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Ganti Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Password Lama</Label>
              <Input
                id="current-password"
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Masukkan password lama"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Masukkan password baru"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Retype Password Baru</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={form.confirmNewPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                placeholder="Ulangi password baru"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={() => void handleChangePassword()} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};
