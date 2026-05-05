import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatIDR } from '@/utils/format';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, ImageIcon, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cartIcon from '../../assets/cart.svg';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CartService } from '@/services/cart.service';
import type { CartItem } from '@/types';
import { ProdukService } from '@/services/produk.service';

const MyOrdersPage = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [updatingQtyIds, setUpdatingQtyIds] = useState<string[]>([]);
    const [materialImageById, setMaterialImageById] = useState<Record<string, string>>({});
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    const paymentLabels: Record<'pay_later' | 'dp' | 'pay_now', string> = {
        pay_later: 'Bayar Nanti',
        dp: 'DP',
        pay_now: 'Lunas',
    };

    const loadCarts = async (options?: { silent?: boolean; showErrorToast?: boolean }) => {
        const silent = options?.silent ?? false;
        const showErrorToast = options?.showErrorToast ?? true;

        if (!silent) setIsLoading(true);
        try {
            const data = await CartService.getMy();
            setCartItems(data.items);
        } catch (error) {
            if (showErrorToast) {
                const message = error instanceof Error ? error.message : 'Gagal memuat keranjang';
                toast({ title: 'Gagal memuat keranjang', description: message, variant: 'destructive' });
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCarts();
    }, []);

    useEffect(() => {
        const loadMaterialImages = async () => {
            try {
                const materials = await ProdukService.getMaterials();
                const mapped = materials.reduce<Record<string, string>>((acc, m) => {
                    if (m.id && m.imageUrl) acc[m.id] = m.imageUrl;
                    return acc;
                }, {});
                setMaterialImageById(mapped);
            } catch {
                setMaterialImageById({});
            }
        };

        void loadMaterialImages();
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            void loadCarts({ silent: true, showErrorToast: false });
        }, 10000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        setSelectedIds((prev) => {
            const currentIds = cartItems.map((item) => item.id);
            const currentSet = new Set(currentIds);
            const filteredPrev = prev.filter((id) => currentSet.has(id));
            const addedIds = currentIds.filter((id) => !prev.includes(id));
            return [...filteredPrev, ...addedIds];
        });
    }, [cartItems]);

    const selectedItems = useMemo(
        () => cartItems.filter((item) => selectedIds.includes(item.id)),
        [cartItems, selectedIds],
    );
    const isAllSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = selectedIds.length > 0 && !isAllSelected;
    }, [selectedIds.length, isAllSelected]);

    const grandTotal = useMemo(
        () => selectedItems.reduce((sum, item) => sum + item.total, 0),
        [selectedItems],
    );

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : cartItems.map((item) => item.id));
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            toast({ title: 'Keranjang masih kosong', variant: 'destructive' });
            return;
        }

        if (selectedItems.length === 0) {
            toast({ title: 'Pilih minimal 1 item dulu', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const checkedIds = selectedItems.map((item) => item.id);
            const result = await CartService.checkout(checkedIds);
            const count = result.checkedOut ?? checkedIds.length;
            await loadCarts();
            toast({ title: `${count} pesanan berhasil dibuat` });
            navigate('/');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal checkout keranjang';
            toast({ title: 'Gagal checkout', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveOne = async (id: string) => {
        try {
            await CartService.remove(id);
            await loadCarts();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal menghapus item';
            toast({ title: 'Gagal menghapus item', description: message, variant: 'destructive' });
        }
    };

    const handleClearCart = async () => {
        try {
            await CartService.clear();
            await loadCarts();
            setSelectedIds([]);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengosongkan keranjang';
            toast({ title: 'Gagal mengosongkan keranjang', description: message, variant: 'destructive' });
        }
    };

    const getTotalQuantity = (item: CartItem) => {
        const items = item.payload.items ?? [];
        if (items.length === 0) return item.payload.quantity ?? 1;
        return items.reduce((sum, x) => sum + (x.quantity ?? 0), 0);
    };

    const handleChangeQuantity = async (item: CartItem, delta: 1 | -1) => {
        const baseItems = item.payload.items ?? [];
        if (baseItems.length === 0) return;

        const oldQty = baseItems.reduce((sum, x) => sum + (x.quantity ?? 0), 0);
        const nextItems = baseItems.map((x) => ({
            ...x,
            quantity: Math.max(1, (x.quantity ?? 1) + delta),
        }));
        const newQty = nextItems.reduce((sum, x) => sum + (x.quantity ?? 0), 0);

        if (oldQty <= 0 || newQty === oldQty) return;

        const nextTotal = Math.max(0, Math.round((item.total / oldQty) * newQty));
        setUpdatingQtyIds((prev) => [...prev, item.id]);
        try {
            await CartService.update(item.id, {
                items: nextItems.map((x) => ({
                    kode_bahan: x.materialId,
                    panjang: x.panjang,
                    lebar: x.lebar,
                    quantity: x.quantity,
                    ...(x.mataAyamLabel ? { mata_ayam: x.mataAyamLabel } : {}),
                    ...(x.materialName ? { nama_bahan: x.materialName } : {}),
                    ...((x.materialImage || materialImageById[x.materialId]) ? { gambar_bahan: x.materialImage || materialImageById[x.materialId] } : {}),
                })),
                estimated_total: nextTotal,
            });
            await loadCarts();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengubah quantity';
            toast({ title: 'Gagal update quantity', description: message, variant: 'destructive' });
        } finally {
            setUpdatingQtyIds((prev) => prev.filter((id) => id !== item.id));
        }
    };

    const resolveMaterialImage = (item: CartItem) => {
        const first = item.payload.items?.[0];
        if (!first) return undefined;
        return first.materialImage || materialImageById[first.materialId];
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center justify-center text-primary transition-colors hover:text-primary/90"
                        title="Kembali ke order"
                        aria-label="Kembali ke order"
                    >
                        <ChevronLeft className="h-7 w-7" />
                    </button>
                    <h1 className="text-2xl font-bold">Keranjang</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/riwayat-pesanan')}>Lihat Status Pesanan</Button>
                    {cartItems.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => void handleClearCart()}
                                    className="inline-flex items-center justify-center text-orange-500 transition-colors hover:text-orange-600"
                                    aria-label="Kosongkan keranjang"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Kosongkan keranjang</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>

            {cartItems.length === 0 ? (
                <div className="p-10 text-center">
                    <img src={cartIcon} alt="Cart" className="mx-auto h-64 w-64 object-contain" />
                    <p className="mt-3 text-lg font-semibold">Keranjang masih kosong</p>
                    <p className="mt-1 text-sm text-muted-foreground">Tambahkan pesanan dari menu Order dulu.</p>
                    <Button className="mt-5" onClick={() => navigate('/')}>Ke Halaman Order</Button>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card px-4 py-5 shadow-sm">
                            <label className="inline-flex cursor-pointer items-center gap-3 text-2xl font-semibold">
                                <input
                                    ref={selectAllRef}
                                    type="checkbox"
                                    className="h-6 w-6 rounded border-border accent-primary"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                />
                                <span>Pilih Semua</span>
                                <span className="text-muted-foreground">({cartItems.length})</span>
                            </label>
                        </div>

                        {cartItems.map((item) => (
                            <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4 rounded border-border accent-primary"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                        <div className="flex items-start gap-3">
                                            <div className="h-16 w-16 overflow-hidden rounded-lg border bg-secondary/40">
                                                {resolveMaterialImage(item) ? (
                                                    <img
                                                        src={resolveMaterialImage(item)}
                                                        alt={item.payload.items?.[0]?.materialName ?? 'Bahan banner'}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString('id-ID')}</p>
                                                <p className="text-lg font-semibold">{item.payload.customer.name}</p>
                                                <p className="text-sm text-muted-foreground">{item.payload.customer.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 rounded-lg bg-secondary/30 p-3">
                                    {(item.payload.items ?? []).map((it, idx) => (
                                        <div key={`${item.id}-${idx}`} className="flex items-start justify-between gap-3 text-sm">
                                            <div>
                                                <p className="font-medium">{it.materialName ?? it.materialId}</p>
                                                <p className="text-muted-foreground">
                                                    {it.panjang} x {it.lebar} m • Qty {it.quantity}
                                                    {it.mataAyamLabel ? ` • ${it.mataAyamLabel}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Metode bayar: {paymentLabels[item.payload.paymentMethod]}</p>
                                        <p className="text-lg font-bold">{formatIDR(item.total)}</p>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                                            onClick={() => void handleRemoveOne(item.id)}
                                            aria-label="Hapus item keranjang"
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                        <div className="inline-flex items-center rounded-full border border-primary/25 px-2 py-1">
                                            <button
                                                type="button"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                                                onClick={() => void handleChangeQuantity(item, -1)}
                                                disabled={updatingQtyIds.includes(item.id) || getTotalQuantity(item) <= 1}
                                                aria-label="Kurangi quantity"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="min-w-10 text-center text-base font-semibold">{getTotalQuantity(item)}</span>
                                            <button
                                                type="button"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                                                onClick={() => void handleChangeQuantity(item, 1)}
                                                disabled={updatingQtyIds.includes(item.id)}
                                                aria-label="Tambah quantity"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <aside className="h-fit rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-24">
                        <p className="text-lg font-semibold">Ringkasan Belanja</p>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Jumlah terpilih</span>
                                <span className="font-medium">{selectedItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between border-t pt-2">
                                <span className="text-muted-foreground">Total</span>
                                <span className="text-xl font-bold">{formatIDR(grandTotal)}</span>
                            </div>
                        </div>

                        <Button className="mt-4 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => void handleCheckout()} disabled={isSubmitting || selectedItems.length === 0}>
                            {isSubmitting ? 'Memproses Checkout...' : `Beli Terpilih (${selectedItems.length})`}
                        </Button>
                        {isLoading && <p className="mt-2 text-center text-xs text-muted-foreground">Menyinkronkan keranjang...</p>}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default MyOrdersPage;
