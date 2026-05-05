import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Check,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    PackageCheck,
    Printer,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatIDR } from '@/utils/format';
import { OrderService } from '@/services/order.service';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

type TimelineStep = {
    key: 'open' | 'processing' | 'printing' | 'selesai';
    label: string;
    icon: ComponentType<{ className?: string }>;
};

const TIMELINE: TimelineStep[] = [
    { key: 'open', label: 'Baru', icon: Clock3 },
    { key: 'processing', label: 'Diproses', icon: PackageCheck },
    { key: 'printing', label: 'Printing', icon: Printer },
    { key: 'selesai', label: 'Selesai', icon: CheckCircle2 },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
    open: 'Baru',
    processing: 'Diproses',
    printing: 'Printing',
    selesai: 'Selesai',
    cancelled: 'Dibatalkan',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
    unpaid: 'Belum Bayar',
    dp: 'DP',
    paid: 'Lunas',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
    open: 'bg-sky-100 text-sky-700',
    processing: 'bg-amber-100 text-amber-700',
    printing: 'bg-violet-100 text-violet-700',
    selesai: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
    unpaid: 'bg-rose-100 text-rose-700',
    dp: 'bg-orange-100 text-orange-700',
    paid: 'bg-emerald-100 text-emerald-700',
};

const formatDateTime = (value: string) => {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getProgressIndex = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    if (status === 'open') return 0;
    if (status === 'processing') return 1;
    if (status === 'printing') return 2;
    if (status === 'selesai') return TIMELINE.length - 1;
    return 0;
};

const OrderHistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('all');

    const loadOrders = async (options?: { silent?: boolean; showErrorToast?: boolean }) => {
        const silent = options?.silent ?? false;
        const showErrorToast = options?.showErrorToast ?? true;

        if (!silent) setIsLoading(true);
        try {
            const data = await OrderService.getMy({
                status: activeStatus,
                page: 1,
                limit: 100,
            });
            setOrders(data.items);
            setSelectedOrderId((prev) => {
                if (data.items.length === 0) return null;
                if (prev && data.items.some((x) => x.id === prev)) return prev;
                return data.items[0].id;
            });
        } catch (error) {
            if (showErrorToast) {
                const message = error instanceof Error ? error.message : 'Gagal memuat pesanan';
                toast({ title: 'Gagal memuat pesanan', description: message, variant: 'destructive' });
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadOrders();
    }, [activeStatus]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void loadOrders({ silent: true, showErrorToast: false });
        }, 10000);

        return () => window.clearInterval(id);
    }, [activeStatus]);

    const selected = useMemo(
        () => orders.find((x) => x.id === selectedOrderId) ?? null,
        [orders, selectedOrderId],
    );

    const stats = useMemo(() => {
        const total = orders.length;
        const processing = orders.filter((x) => x.status === 'processing' || x.status === 'printing').length;
        const done = orders.filter((x) => x.status === 'selesai').length;
        const cancelled = orders.filter((x) => x.status === 'cancelled').length;
        const unpaid = orders.filter((x) => x.payment_status === 'unpaid').length;
        return { total, processing, done, cancelled, unpaid };
    }, [orders]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Pesanan Saya</h1>
                    <p className="text-sm text-muted-foreground">Pantau status pengerjaan dan pembayaran pesanan Anda secara realtime.</p>
                </div>
                <Button onClick={() => navigate('/')} className="w-full sm:w-auto">
                    Buat Pesanan Baru
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Semua Pesanan</p>
                    <p className="mt-1 text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Sedang Dikerjakan</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{stats.processing}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Selesai</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{stats.done}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Dibatalkan</p>
                    <p className="mt-1 text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Belum Bayar</p>
                    <p className="mt-1 text-2xl font-bold text-rose-600">{stats.unpaid}</p>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <section className="flex h-full min-h-0 flex-col rounded-xl border bg-card p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold">Daftar Pesanan</p>
                        <Select
                            value={activeStatus}
                            onValueChange={(value) => setActiveStatus(value as OrderStatus | 'all')}
                        >
                            <SelectTrigger className="h-9 w-full border-primary/30 bg-primary/5 text-xs font-medium text-primary focus:border-primary sm:w-[170px]">
                                <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent className="border-primary/20">
                                <SelectItem value="all" className="focus:bg-primary focus:text-primary-foreground">Semua</SelectItem>
                                <SelectItem value="open" className="focus:bg-primary focus:text-primary-foreground">Baru</SelectItem>
                                <SelectItem value="processing" className="focus:bg-primary focus:text-primary-foreground">Diproses</SelectItem>
                                <SelectItem value="printing" className="focus:bg-primary focus:text-primary-foreground">Printing</SelectItem>
                                <SelectItem value="selesai" className="focus:bg-primary focus:text-primary-foreground">Selesai</SelectItem>
                                <SelectItem value="cancelled" className="focus:bg-primary focus:text-primary-foreground">Dibatalkan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                        {isLoading ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">Memuat pesanan...</p>
                        ) : orders.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">Belum ada pesanan.</p>
                        ) : (
                            <div className="space-y-2 pb-1">
                                {orders.map((order) => (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => setSelectedOrderId(order.id)}
                                        className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedOrderId === order.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold">{order.no_faktur}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[order.status]}`}>
                                                {STATUS_LABEL[order.status]}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <p className="text-sm font-semibold">{formatIDR(order.total)}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAYMENT_BADGE[order.payment_status]}`}>
                                                {PAYMENT_LABEL[order.payment_status]}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border bg-card p-4">
                    {!selected ? (
                        <p className="py-12 text-center text-sm text-muted-foreground">Pilih salah satu pesanan untuk lihat detail.</p>
                    ) : (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-xl font-bold">{selected.no_faktur}</h2>
                                    <p className="text-sm text-muted-foreground">{formatDateTime(selected.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[selected.status]}`}>
                                        {STATUS_LABEL[selected.status]}
                                    </span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PAYMENT_BADGE[selected.payment_status]}`}>
                                        {PAYMENT_LABEL[selected.payment_status]}
                                    </span>
                                </div>
                            </div>

                            {selected.status === 'cancelled' ? (
                                <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <XCircle className="h-4 w-4" /> Pesanan dibatalkan
                                    </div>
                                    <p className="mt-1 text-sm">Pesanan ini tidak dilanjutkan ke proses produksi.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-secondary/20 p-4">
                                    <p className="mb-3 text-sm font-semibold">Progress Pengerjaan</p>
                                    <div className="overflow-x-auto pb-2">
                                        <div className="min-w-[360px] px-2 md:min-w-[480px]">
                                            <div className="relative pt-1">
                                                <div className="absolute left-10 right-10 top-6 border-t border-dashed border-border" />
                                                <div className="relative grid grid-cols-4 gap-2">
                                                    {TIMELINE.map((step, idx) => {
                                                        const currentIdx = getProgressIndex(selected.status);
                                                        const isDone = currentIdx > idx;
                                                        const isActive = currentIdx === idx;
                                                        const Icon = step.icon;

                                                        return (
                                                            <div key={step.key} className="flex flex-col items-center text-center">
                                                                <div
                                                                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isDone
                                                                        ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                                                                        : isActive
                                                                            ? 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15'
                                                                            : 'border-border bg-muted text-muted-foreground'
                                                                        }`}
                                                                >
                                                                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                                                </div>
                                                                <p className={`mt-2 text-xs font-semibold ${isDone || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                                    {step.label}
                                                                </p>
                                                                {(idx === 0 || isActive) && (
                                                                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(selected.createdAt)}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border p-4">
                                    <p className="text-sm font-semibold">Detail Pembayaran</p>
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="font-medium">{PAYMENT_LABEL[selected.payment_status]}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Total</span>
                                            <span className="font-semibold">{formatIDR(selected.total)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">DP</span>
                                            <span className="font-medium">{formatIDR(selected.dp_amount ?? 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Sisa</span>
                                            <span className="font-medium">{formatIDR(selected.sisa ?? 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <p className="text-sm font-semibold">Informasi Pemesan</p>
                                    <div className="mt-3 space-y-2 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Nama</span>
                                            <span className="text-right font-medium">{selected.customer.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">No HP</span>
                                            <span className="text-right font-medium">{selected.customer.phone}</span>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Alamat</p>
                                            <p className="font-medium">{selected.customer.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border p-4">
                                <p className="mb-3 text-sm font-semibold">Item Pesanan</p>
                                <div className="space-y-2">
                                    {(selected.items?.length ? selected.items : []).map((item, idx) => (
                                        <div key={`${selected.id}-${idx}`} className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-secondary/20 px-3 py-2 text-sm">
                                            <div>
                                                <p className="font-medium">{item.nama_bahan}</p>
                                                <p className="text-muted-foreground">
                                                    {item.panjang} x {item.lebar} m • Qty {item.quantity}
                                                    {item.mata_ayam ? ` • ${item.mata_ayam}` : ''}
                                                </p>
                                            </div>
                                            <p className="font-semibold sm:ml-auto">{formatIDR(item.subtotal)}</p>
                                        </div>
                                    ))}
                                    {(!selected.items || selected.items.length === 0) && (
                                        <p className="text-sm text-muted-foreground">Detail item tidak tersedia.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-800">
                                <div className="flex items-center gap-2 font-semibold">
                                    <CircleDollarSign className="h-4 w-4" /> Update realtime setiap 10 detik
                                </div>
                                <p className="mt-1">Status pengerjaan dan pembayaran akan ter-update otomatis tanpa perlu refresh halaman.</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default OrderHistoryPage;
