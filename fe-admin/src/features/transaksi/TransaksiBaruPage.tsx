import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, UploadCloud, FileIcon, X, Wallet, CreditCard, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bahanService, mataAyamService } from '@/services/master.service';
import { transaksiService } from '@/services/transaksi.service';
import { storeService } from '@/services/store.service';
import { Material, Eyelet } from '@/types/material';
import { formatIDR } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import lunasIcon from '@/assets/lunas_icon.png';
import belumLunasIcon from '@/assets/belum_lunas_icon.png';
import ngtcLogo from '@/assets/NGTC.png';

type NotaPdfModule = typeof import('./nota-pdf');
let notaPdfModulePromise: Promise<NotaPdfModule> | null = null;
const getNotaPdfModule = (): Promise<NotaPdfModule> => {
  if (!notaPdfModulePromise) notaPdfModulePromise = import('./nota-pdf');
  return notaPdfModulePromise;
};

const blockArrow = (e: React.KeyboardEvent) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); };

const schema = z.object({
  nama_customer: z.string().trim().min(2).max(100),
  no_hp: z.string().trim().min(8).max(20),
  alamat: z.string().trim().min(3).max(200),
  kode_bahan: z.string().min(1),
  panjang: z.coerce.number().min(0.01),
  lebar: z.coerce.number().min(0.01),
  quantity: z.coerce.number().min(1),
  mata_ayam: z.string().optional(),
  payment_method: z.enum(['pay_now', 'dp', 'pay_later']),
  dp_amount: z.coerce.number().optional(),
}).superRefine((d, ctx) => {
  if (d.payment_method === 'dp' && (!d.dp_amount || d.dp_amount <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Masukkan jumlah DP', path: ['dp_amount'] });
  }
});
type FormData = z.infer<typeof schema>;

const PAYMENT_OPTIONS = [
  { value: 'pay_now' as const, title: 'Bayar Penuh', desc: 'Upload bukti transfer sekarang.', Icon: Wallet },
  { value: 'dp' as const, title: 'Bayar DP', desc: 'Bayar uang muka, sisa sebelum diambil.', Icon: CreditCard },
  { value: 'pay_later' as const, title: 'Bayar Nanti', desc: 'Simpan dulu, bayar maks 1×24 jam.', Icon: Clock },
];

export default function TransaksiBaruPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [eyelets, setEyelets] = useState<Eyelet[]>([]);
  const [orderItems, setOrderItems] = useState<Array<{
    kode_bahan: string;
    nama_bahan: string;
    panjang: number;
    lebar: number;
    quantity: number;
    mata_ayam?: string;
    subtotal: number;
  }>>([]);
  const [proofFile, setProofFile] = useState<File | undefined>();
  const [proofPreview, setProofPreview] = useState<string | undefined>();
  const [dpDisplay, setDpDisplay] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nama_customer: '', no_hp: '', alamat: '', kode_bahan: '', panjang: 1, lebar: 1, quantity: 1, mata_ayam: 'none', payment_method: undefined as unknown as 'pay_now' | 'dp' | 'pay_later' },
  });

  const paymentMethod = watch('payment_method');
  const needsProof = paymentMethod === 'pay_now' || paymentMethod === 'dp';

  useEffect(() => {
    Promise.all([bahanService.getAll(), mataAyamService.getAll()]).then(([m, e]) => {
      setMaterials(m.filter((x) => x.is_active));
      setEyelets(e);
      if (m[0]) setValue('kode_bahan', m[0].code);
    });
  }, [setValue]);

  useEffect(() => {
    if (proofFile && proofFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(proofFile);
      setProofPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setProofPreview(undefined);
  }, [proofFile]);

  useEffect(() => {
    if (paymentMethod !== 'dp') { setDpDisplay(''); setValue('dp_amount', undefined); }
    if (paymentMethod === 'pay_later') setProofFile(undefined);
  }, [paymentMethod, setValue]);

  const onDrop = useCallback((accepted: File[]) => { if (accepted[0]) setProofFile(accepted[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxSize: 10 * 1024 * 1024,
  });

  const handleDpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setDpDisplay(''); setValue('dp_amount', undefined, { shouldValidate: true }); return; }
    const num = parseInt(raw, 10);
    setDpDisplay(new Intl.NumberFormat('id-ID').format(num));
    setValue('dp_amount', num, { shouldValidate: true });
  };

  const selectedMaterial = materials.find((m) => m.code === watch('kode_bahan'));
  const currentSubtotal = useMemo(() => Math.round(
    (watch('panjang') || 0) * (watch('lebar') || 0) * (watch('quantity') || 0) * (selectedMaterial?.price_per_meter || 0)
  ), [watch('panjang'), watch('lebar'), watch('quantity'), selectedMaterial?.price_per_meter]);
  const total = useMemo(() => {
    if (orderItems.length === 0) return currentSubtotal;
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [orderItems, currentSubtotal]);

  const proofSizeLabel = useMemo(() => proofFile ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB` : '', [proofFile]);

  const addCurrentItem = () => {
    const kode_bahan = watch('kode_bahan');
    const panjang = Number(watch('panjang')) || 0;
    const lebar = Number(watch('lebar')) || 0;
    const quantity = Number(watch('quantity')) || 0;
    const mata_ayam = watch('mata_ayam');
    const selected = materials.find((m) => m.code === kode_bahan);

    if (!selected || panjang <= 0 || lebar <= 0 || quantity <= 0) {
      toast.error('Lengkapi bahan, ukuran, dan qty item terlebih dahulu');
      return;
    }

    const subtotal = Math.round(panjang * lebar * quantity * selected.price_per_meter);
    setOrderItems((prev) => [
      ...prev,
      {
        kode_bahan,
        nama_bahan: selected.name,
        panjang,
        lebar,
        quantity,
        mata_ayam: mata_ayam === 'none' ? '' : mata_ayam,
        subtotal,
      },
    ]);
    toast.success('Item ditambahkan');
  };

  const removeItem = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (form: FormData) => {
    try {
      const itemsPayload = orderItems.length > 0
        ? orderItems.map((item) => ({
          kode_bahan: item.kode_bahan,
          panjang: item.panjang,
          lebar: item.lebar,
          quantity: item.quantity,
          mata_ayam: item.mata_ayam,
        }))
        : [{
          kode_bahan: form.kode_bahan,
          panjang: form.panjang,
          lebar: form.lebar,
          quantity: form.quantity,
          mata_ayam: form.mata_ayam === 'none' ? '' : form.mata_ayam,
        }];

      const payload = {
        ...form,
        mata_ayam: form.mata_ayam === 'none' ? '' : form.mata_ayam,
        dp_amount: form.payment_method === 'dp' ? form.dp_amount : undefined,
        items: itemsPayload,
        kode_bahan: itemsPayload[0]?.kode_bahan,
        panjang: itemsPayload[0]?.panjang,
        lebar: itemsPayload[0]?.lebar,
        quantity: itemsPayload[0]?.quantity,
      };
      const order = await transaksiService.create(payload, needsProof && proofFile ? { proofFile } : undefined);
      const notaPdf = await getNotaPdfModule();
      const [store, logoDataUrl, lunasDataUrl, belumLunasDataUrl] = await Promise.all([
        storeService.getReportHeader(),
        notaPdf.loadImageAsDataUrl(ngtcLogo),
        notaPdf.loadImageAsDataUrl(lunasIcon),
        notaPdf.loadImageAsDataUrl(belumLunasIcon),
      ]);
      const watermarkDataUrl = order.payment_status === 'paid' ? lunasDataUrl : belumLunasDataUrl;
      notaPdf.downloadOrderNotaPdf({
        order,
        store,
        logoDataUrl,
        watermarkDataUrl,
      });
      toast.success('Transaksi dibuat');
      navigate('/transaksi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/70 shadow-card">
        <CardHeader className="rounded-none bg-slate-800 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-semibold text-white m-0">Transaksi Baru</CardTitle>
            <Button onClick={() => navigate(-1)} className="h-11 w-full px-6 gradient-primary text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />Kembali
            </Button>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Data Pesanan */}
          <Card className="shadow-card border-border/60">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-base font-semibold">Data Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nama Pelanggan</Label><Input {...register('nama_customer')} />{errors.nama_customer && <p className="text-xs text-destructive">{errors.nama_customer.message}</p>}</div>
              <div className="space-y-1.5"><Label>No. WhatsApp</Label><Input {...register('no_hp')} />{errors.no_hp && <p className="text-xs text-destructive">{errors.no_hp.message}</p>}</div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Alamat</Label><Textarea {...register('alamat')} rows={2} />{errors.alamat && <p className="text-xs text-destructive">{errors.alamat.message}</p>}</div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bahan</Label>
                <Select value={watch('kode_bahan')} onValueChange={(v) => setValue('kode_bahan', v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => <SelectItem key={m.code} value={m.code}>{m.name} — {formatIDR(m.price_per_meter)}/m²</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Panjang (m)</Label>
                <Input inputMode="decimal" onKeyDown={blockArrow} {...register('panjang')} />
                {errors.panjang && <p className="text-xs text-destructive">{errors.panjang.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Lebar (m)</Label>
                <Input inputMode="decimal" onKeyDown={blockArrow} {...register('lebar')} />
                {errors.lebar && <p className="text-xs text-destructive">{errors.lebar.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input inputMode="numeric" onKeyDown={blockArrow} {...register('quantity')} />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Mata Ayam</Label>
                <Select value={watch('mata_ayam') ?? 'none'} onValueChange={(v) => setValue('mata_ayam', v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Tanpa mata ayam" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa mata ayam</SelectItem>
                    {eyelets.map((e) => <SelectItem key={e._id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Button type="button" className="w-full" onClick={addCurrentItem}>Tambah Item</Button>
              </div>
              {orderItems.length > 0 && (
                <div className="space-y-2 sm:col-span-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Daftar Item</p>
                  {orderItems.map((item, idx) => (
                    <div key={`${item.kode_bahan}-${idx}`} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.nama_bahan}</p>
                        <p className="text-xs text-muted-foreground">{item.panjang} x {item.lebar} m • Qty {item.quantity}{item.mata_ayam ? ` • ${item.mata_ayam}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatIDR(item.subtotal)}</span>
                        <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => removeItem(idx)}>Hapus</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metode Pembayaran */}
          <Card className="shadow-card border-border/60">
            <CardHeader className="px-6 py-4">
              <CardTitle className="text-base font-semibold">Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map(({ value, title, desc, Icon }) => {
                  const active = paymentMethod === value;
                  return (
                    <button key={value} type="button"
                      onClick={() => setValue('payment_method', value, { shouldValidate: true })}
                      className={cn('flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                        active ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/40')}
                    >
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === 'dp' && (
                <div className="space-y-1.5">
                  <Label>Jumlah DP (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input inputMode="numeric" placeholder="Contoh: 150.000" value={dpDisplay} onChange={handleDpChange} className="pl-9" />
                  </div>
                  {errors.dp_amount && <p className="text-xs text-destructive">{errors.dp_amount.message}</p>}
                </div>
              )}

              {needsProof && (
                <div className="space-y-2">
                  <Label>Bukti Transfer {paymentMethod === 'dp' ? '(DP)' : ''}</Label>
                  {!proofFile ? (
                    <div {...getRootProps()} className={cn(
                      'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                      isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}>
                      <input {...getInputProps()} />
                      <UploadCloud className="mb-1.5 h-7 w-7 text-primary" />
                      <p className="text-sm">Drag & drop atau klik untuk pilih</p>
                      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG — maks 10MB</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                      {proofPreview
                        ? <img src={proofPreview} alt="bukti" className="h-16 w-16 rounded-lg object-cover" />
                        : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10"><FileIcon className="h-7 w-7 text-success" /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{proofFile.name}</p>
                        <p className="text-xs text-muted-foreground">{proofSizeLabel}</p>
                      </div>
                      <button type="button" onClick={() => setProofFile(undefined)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ringkasan */}
        <Card className="h-fit shadow-card border-border/60 lg:sticky lg:top-20">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base font-semibold">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Estimasi Total</span><span className="font-semibold text-primary">{formatIDR(total)}</span></div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full gradient-primary text-primary-foreground shadow-glow">
              Simpan Transaksi
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

