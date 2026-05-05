import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { orderFormSchema, type OrderFormValues } from './orderSchema';
import { useOrderStore } from '@/store/orderStore';
import { calculatePrice } from '@/utils/pricing';
import { FormSection } from './components/FormSection';
import { MaterialSection } from './components/MaterialSection';
import { SizeSection } from './components/SizeSection';
import { OptionsSection } from './components/OptionsSection';
import { DesignUploadSection } from './components/DesignUploadSection';
import { NotesSection } from './components/NotesSection';
import { PaymentSection } from './components/PaymentSection';
import { OrderSummary } from './components/OrderSummary';
import { formatIDR } from '@/utils/format';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { CartService } from '@/services/cart.service';

export const OrderPage = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{
    materialId: string;
    materialName: string;
    materialImage?: string;
    panjang: number;
    lebar: number;
    quantity: number;
    mataAyamLabel?: string;
    subtotal: number;
  }>>([]);
  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onChange',
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      address: '',
      materialId: '',
      panjang: 0,
      lebar: 0,
      quantity: 1,
      mataAyamId: 'none',
      notes: '',
      paymentMethod: 'pay_later',
    },
  });

  const {
    selectedMaterial, selectedOption, panjang, lebar, quantity,
    designFile, proofFile, reset,
  } = useOrderStore();

  const total = useMemo(
    () => calculatePrice(selectedMaterial, selectedOption, panjang, lebar, quantity).total,
    [selectedMaterial, selectedOption, panjang, lebar, quantity],
  );
  const finalTotal = useMemo(() => {
    if (orderItems.length === 0) return total;
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [orderItems, total]);

  const isFormValid = methods.formState.isValid && !!designFile && total > 0;
  const hasOrderItems = orderItems.length > 0;
  const canAddToCart = isFormValid && hasOrderItems && !isAddingToCart;

  useEffect(() => {
    if (!authUser) return;
    methods.setValue('customerName', authUser.nama, { shouldValidate: true });
    methods.setValue('customerPhone', authUser.no_hp, { shouldValidate: true });
    methods.setValue('customerEmail', authUser.email, { shouldValidate: true });
    methods.setValue('address', authUser.alamat, { shouldValidate: true });
  }, [authUser, methods]);

  const runFlyToCartAnimation = () => {
    const source = addToCartButtonRef.current;
    const target = document.getElementById('cart-button');
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = `${sourceRect.left + sourceRect.width / 2 - 7}px`;
    dot.style.top = `${sourceRect.top + sourceRect.height / 2 - 7}px`;
    dot.style.width = '14px';
    dot.style.height = '14px';
    dot.style.borderRadius = '9999px';
    dot.style.background = 'rgb(8 145 178)';
    dot.style.boxShadow = '0 0 0 6px rgb(34 211 238 / 0.25)';
    dot.style.zIndex = '9999';
    dot.style.pointerEvents = 'none';
    dot.style.transition = 'transform 0.65s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.65s ease';
    document.body.appendChild(dot);

    requestAnimationFrame(() => {
      const translateX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
      const translateY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
      dot.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.2)`;
      dot.style.opacity = '0.1';
    });

    window.setTimeout(() => {
      dot.remove();
    }, 700);
  };

  const onAddToCart = async (values: OrderFormValues) => {
    if (!hasOrderItems) {
      toast({ title: 'Tambah item dulu ke nota', description: 'Silakan klik "Tambah Item ke Nota" sebelum menambahkan ke keranjang.', variant: 'destructive' });
      return;
    }
    if (!designFile) {
      toast({ title: 'Design wajib diupload', variant: 'destructive' });
      return;
    }
    if (values.paymentMethod === 'pay_now' && !proofFile) {
      toast({ title: 'Bukti transfer wajib diupload', variant: 'destructive' });
      return;
    }
    if (values.paymentMethod === 'dp' && !proofFile) {
      toast({ title: 'Bukti transfer DP wajib diupload', variant: 'destructive' });
      return;
    }
    const eyeletName = selectedOption && selectedOption.id !== 'none' ? selectedOption.label : undefined;
    const payloadItems = orderItems.map((item) => ({
      materialId: item.materialId,
      panjang: item.panjang,
      lebar: item.lebar,
      quantity: item.quantity,
      mataAyamLabel: item.mataAyamLabel,
      materialName: item.materialName,
      materialImage: item.materialImage,
    }));

    try {
      setIsAddingToCart(true);
      await CartService.addItem({
        order: {
          customer: { name: values.customerName, phone: values.customerPhone, address: values.address, email: values.customerEmail || undefined },
          materialId: values.materialId,
          panjang: values.panjang,
          lebar: values.lebar,
          quantity: values.quantity,
          mataAyamId: values.mataAyamId,
          items: payloadItems,
          notes: values.notes,
          paymentMethod: values.paymentMethod,
          dpAmount: values.dpAmount,
        },
        total: finalTotal,
        designFile,
        proofFile,
      });

      runFlyToCartAnimation();
      toast({ title: 'Pesanan masuk ke keranjang' });
      navigate('/pesanan');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menambahkan ke keranjang';
      toast({ title: 'Gagal menambahkan ke keranjang', description: message, variant: 'destructive' });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const addCurrentItem = () => {
    const values = methods.getValues();
    const itemMaterial = selectedMaterial;
    if (!itemMaterial) {
      toast({ title: 'Pilih bahan dulu', variant: 'destructive' });
      return;
    }
    if (values.panjang <= 0 || values.lebar <= 0 || values.quantity <= 0) {
      toast({ title: 'Ukuran dan qty item harus valid', variant: 'destructive' });
      return;
    }
    const eyeletName = selectedOption && selectedOption.id !== 'none' ? selectedOption.label : undefined;
    const subtotal = calculatePrice(itemMaterial, selectedOption, values.panjang, values.lebar, values.quantity).total;
    setOrderItems((prev) => [
      ...prev,
      {
        materialId: values.materialId,
        materialName: itemMaterial.name,
        panjang: values.panjang,
        lebar: values.lebar,
        quantity: values.quantity,
        mataAyamLabel: eyeletName,
        materialImage: itemMaterial.imageUrl,
        subtotal,
      },
    ]);
    toast({ title: 'Item ditambahkan' });
  };

  const removeItem = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <FormProvider {...methods}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Pesan Banner <span className="gradient-text">Online</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cetak banner & spanduk berkualitas, harga real-time, proses cepat. Isi form di bawah dan order siap kami proses.
        </p>
      </div>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <FormSection step={1} title="Pilih Bahan" description="Pilih jenis material banner yang Anda inginkan.">
            <MaterialSection />
          </FormSection>
          <FormSection step={2} title="Ukuran Banner" description="Masukkan panjang & lebar dalam meter.">
            <SizeSection />
          </FormSection>
          <FormSection step={3} title="Opsi Tambahan" description="Tambahan finishing untuk pemasangan.">
            <OptionsSection />
          </FormSection>
          <div className="rounded-xl border bg-card p-4">
            <Button type="button" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={addCurrentItem}>Tambah Item ke Nota</Button>
            {orderItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={`${item.materialId}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary/30 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">{item.panjang} x {item.lebar} m • Qty {item.quantity}{item.mataAyamLabel ? ` • ${item.mataAyamLabel}` : ''}</p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-normal">
                      <span className="font-semibold">{formatIDR(item.subtotal)}</span>
                      <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => removeItem(idx)}>Hapus</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <FormSection step={4} title="Upload Design" description="File akhir yang akan dicetak.">
            <DesignUploadSection />
          </FormSection>
          <FormSection step={5} title="Catatan" description="Instruksi khusus untuk tim produksi (opsional).">
            <NotesSection />
          </FormSection>
          <FormSection step={6} title="Data & Pembayaran" description="Pilih metode pembayaran yang sesuai.">
            <PaymentSection />
          </FormSection>
        </div>

        <aside className="xl:sticky xl:top-24 xl:h-fit">
          <OrderSummary items={orderItems} grandTotal={finalTotal} />
          <Button
            ref={addToCartButtonRef}
            type="button"
            size="lg"
            disabled={!canAddToCart}
            onClick={methods.handleSubmit(onAddToCart)}
            className="mt-4 h-12 w-full bg-gradient-primary text-base font-semibold shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isAddingToCart ? 'Menyimpan ke Keranjang...' : 'Tambah ke Keranjang'}
          </Button>
          {!hasOrderItems && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Silahkan klik tambah item untuk menambahkan ke keranjang.
            </p>
          )}
          {hasOrderItems && !isFormValid && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Lengkapi semua field & upload design untuk menambahkan ke keranjang
            </p>
          )}
        </aside>
      </form>
    </FormProvider>
  );
};

export default OrderPage;
