import { useEffect, useState } from 'react';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, TrendingUp, Wallet, Users } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { transaksiService } from '@/services/transaksi.service';
import { Order } from '@/types/order';
import { formatIDR, formatDate } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

function calcTrend(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = async () => {
    const r = await transaksiService.getPaged({ limit: 1000 });
    setOrders(r.items as Order[]);
  };

  useEffect(() => {
    void load();
  }, []);
  useAutoRefresh(load, { intervalMs: 10_000 });

  const now = new Date();
  const activeYear = now.getFullYear();
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const getInitialPayment = (o: Order) => o.dp_amount ?? (o.payment_status === 'paid' ? o.harga_total : 0);
  const getSettlementPayment = (o: Order) => (o.paid_date ? (o.dibayar ?? o.sisa ?? 0) : 0);

  // Order count & customer count: based on created_at
  const curOrders = orders.filter((o) => new Date(o.created_at) >= curStart);
  const prevOrders = orders.filter((o) => { const d = new Date(o.created_at); return d >= prevStart && d <= prevEnd; });

  // Revenue: dp_amount is the initial cash received at creation
  // (dp: dp_amount = DP paid, full-paid-at-creation: dp_amount = harga_total, unpaid: dp_amount = 0)
  // paid_date: when uploadPaymentProof was called later (pelunasan or full payment after creation)
  // dibayar: sisa (for DP pelunasan) or harga_total (for unpaid→paid)
  const totalRevenue =
    orders.filter((o) => o.status !== 'cancelled' && new Date(o.created_at) >= curStart)
      .reduce((s, o) => s + getInitialPayment(o), 0) +
    orders.filter((o) => o.status !== 'cancelled' && o.paid_date && new Date(o.paid_date) >= curStart)
      .reduce((s, o) => s + getSettlementPayment(o), 0);

  const prevRevenue =
    orders.filter((o) => o.status !== 'cancelled' && new Date(o.created_at) >= prevStart && new Date(o.created_at) <= prevEnd)
      .reduce((s, o) => s + getInitialPayment(o), 0) +
    orders.filter((o) => o.status !== 'cancelled' && o.paid_date && new Date(o.paid_date) >= prevStart && new Date(o.paid_date) <= prevEnd)
      .reduce((s, o) => s + getSettlementPayment(o), 0);

  const waiting = curOrders.filter((o) => o.payment_status === 'unpaid').length;
  const prevWaiting = prevOrders.filter((o) => o.payment_status === 'unpaid').length;

  const curCustomers = new Set(curOrders.map((o) => o.no_hp)).size;
  const prevCustomers = new Set(prevOrders.map((o) => o.no_hp)).size;

  // Chart: group by actual payment month for active year only.
  const monthMap = new Map<string, { label: string; value: number; sortKey: number }>();
  const monthStart = new Date(activeYear, 0, 1);

  for (let i = 0; i <= now.getMonth(); i += 1) {
    const d = new Date(activeYear, i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('id-ID', { month: 'short' }).replace('.', '');
    monthMap.set(key, { label, value: 0, sortKey: d.getTime() });
  }

  const addToChart = (dateStr: string, amount: number) => {
    if (amount <= 0) return;
    const d = new Date(dateStr);
    if (d.getFullYear() !== activeYear) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(key);
    if (!existing) return;
    monthMap.set(key, { ...existing, value: existing.value + amount });
  };

  orders.filter((o) => o.status !== 'cancelled').forEach((o) => {
    addToChart(o.created_at, getInitialPayment(o));
    if (o.paid_date) addToChart(o.paid_date, getSettlementPayment(o));
  });

  const revenueData = Array.from(monthMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, value }) => ({ month: label, value }));

  const latestTodayOrders = orders
    .filter((o) => {
      const created = new Date(o.created_at);
      return created >= todayStart && created <= todayEnd;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="border-border-/70 overflow-hidden border shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <CardTitle className="text-xl font-semibold text-white">Dashboard</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pendapatan" value={formatIDR(totalRevenue)} icon={Wallet} trend={calcTrend(totalRevenue, prevRevenue)} accent="primary" />
            <StatCard label="Transaksi" value={String(curOrders.length)} icon={Receipt} trend={calcTrend(curOrders.length, prevOrders.length)} accent="info" />
            <StatCard label="Menunggu Bayar" value={String(waiting)} icon={TrendingUp} trend={calcTrend(waiting, prevWaiting)} accent="warning" />
            <StatCard label="Pelanggan" value={String(curCustomers)} icon={Users} trend={calcTrend(curCustomers, prevCustomers)} accent="success" />
          </div>

          <Card className="border-border-/70 overflow-hidden border shadow-card">
            <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
              <CardTitle className="text-xl font-semibold text-white">Pendapatan {activeYear}</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px] p-4 sm:h-[320px] sm:p-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: number) => formatIDR(v)} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border-/70 overflow-hidden border shadow-card">
            <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
              <CardTitle className="text-xl font-semibold text-white">Transaksi Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-hidden rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left text-base font-semibold text-foreground">
                        <th className="px-5 py-4">Kode</th>
                        <th className="px-5 py-4">Pelanggan</th>
                        <th className="px-5 py-4">Tanggal</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestTodayOrders.map((o) => (
                        <tr key={o._id} className="border-t hover:bg-muted/30">
                          <td className="px-5 py-5 font-medium">{o.no_faktur}</td>
                          <td className="px-5 py-5">{o.nama_customer}</td>
                          <td className="px-5 py-5 text-muted-foreground">{formatDate(o.created_at)}</td>
                          <td className="px-5 py-5"><StatusBadge status={o.status} /></td>
                          <td className="px-5 py-5 text-right font-semibold">{formatIDR(o.harga_total)}</td>
                        </tr>
                      ))}
                      {latestTodayOrders.length === 0 && (
                        <tr className="border-t">
                          <td className="px-5 py-5 text-center text-muted-foreground" colSpan={5}>
                            Belum ada transaksi hari ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
