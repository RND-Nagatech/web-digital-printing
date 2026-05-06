import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { settingsService } from '@/services/settings.service';
import { OrderPolicyDto } from '@/types/dto/settings.dto';
import { useAuthStore } from '@/store/auth.store';

const defaultForm: OrderPolicyDto = {
  max_unpaid_orders: 2,
  unpaid_expiry_hours: 24,
  allow_process_unpaid: false,
  allow_process_dp: true,
  suspend_after_auto_cancel_count: 3,
  suspend_days: 7,
};

export default function PengaturanPage() {
  const canUpdateSettings = useAuthStore((s) => s.hasPermission('settings:update'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OrderPolicyDto>(defaultForm);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await settingsService.getOrderPolicy();
        setForm(data);
      } catch {
        toast.error('Gagal memuat pengaturan');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const save = async () => {
    if (!canUpdateSettings) {
      toast.error('Anda tidak memiliki izin untuk mengubah pengaturan');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        max_unpaid_orders: form.max_unpaid_orders,
        unpaid_expiry_hours: form.unpaid_expiry_hours,
        allow_process_unpaid: form.allow_process_unpaid,
        allow_process_dp: form.allow_process_dp,
        suspend_after_auto_cancel_count: form.suspend_after_auto_cancel_count,
        suspend_days: form.suspend_days,
      };
      const data = await settingsService.updateOrderPolicy(payload);
      setForm(data);
      toast.success('Pengaturan berhasil disimpan');
      window.dispatchEvent(new Event('order-policy-updated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border-/70 overflow-hidden border shadow-card">
      <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
        <CardTitle className="text-xl font-semibold text-white">Pengaturan Pesanan</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Batas Penggunaan Bayar Nanti per Customer</Label>
            <Input
              type="number"
              min={0}
              disabled={loading}
              value={form.max_unpaid_orders}
              onChange={(e) => setForm((s) => ({ ...s, max_unpaid_orders: Number(e.target.value || 0) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Batas Waktu Bayar (Jam)</Label>
            <Input
              type="number"
              min={1}
              disabled={loading}
              value={form.unpaid_expiry_hours}
              onChange={(e) => setForm((s) => ({ ...s, unpaid_expiry_hours: Number(e.target.value || 1) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jumlah Pembatalan Otomatis Sebelum Bayar Nanti Dibatasi (Kali)</Label>
            <Input
              type="number"
              min={1}
              disabled={loading}
              value={form.suspend_after_auto_cancel_count}
              onChange={(e) => setForm((s) => ({ ...s, suspend_after_auto_cancel_count: Number(e.target.value || 1) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Durasi Pembatasan Bayar Nanti (Hari)</Label>
            <Input
              type="number"
              min={1}
              disabled={loading}
              value={form.suspend_days}
              onChange={(e) => setForm((s) => ({ ...s, suspend_days: Number(e.target.value || 1) }))}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            Catatan: pembatasan ini hanya menonaktifkan metode <span className="font-medium">Bayar Nanti</span> sementara.
            Customer tetap bisa pesan dengan metode pembayaran lain.
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Izinkan Admin Proses Pesanan yang Belum Dibayar</p>
              <p className="text-xs text-muted-foreground">Jika nonaktif, status produksi hanya untuk order yang sudah bayar.</p>
            </div>
            <Switch
              checked={form.allow_process_unpaid}
              onCheckedChange={(v) => setForm((s) => ({ ...s, allow_process_unpaid: v }))}
              disabled={loading || !canUpdateSettings}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Izinkan Admin Proses Pesanan DP</p>
              <p className="text-xs text-muted-foreground">Jika nonaktif, order DP harus lunas dulu sebelum diproses.</p>
            </div>
            <Switch
              checked={form.allow_process_dp}
              onCheckedChange={(v) => setForm((s) => ({ ...s, allow_process_dp: v }))}
              disabled={loading || !canUpdateSettings}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={loading || saving || !canUpdateSettings} className="gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
