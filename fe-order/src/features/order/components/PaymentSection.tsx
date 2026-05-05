import { useFormContext } from 'react-hook-form';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOrderStore } from '@/store/orderStore';
import { UploadCloud, FileIcon, X, Wallet, Clock, CreditCard } from 'lucide-react';
import type { OrderFormValues } from '../orderSchema';

export const PaymentSection = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext<OrderFormValues>();
  const method = watch('paymentMethod');
  const [dpDisplay, setDpDisplay] = useState('');
  const proofFile = useOrderStore((s) => s.proofFile);
  const setProofFile = useOrderStore((s) => s.setProofFile);
  const [proofPreview, setProofPreview] = useState<string | undefined>();

  useEffect(() => {
    if (proofFile && proofFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(proofFile);
      setProofPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setProofPreview(undefined);
  }, [proofFile]);

  const proofSizeLabel = useMemo(
    () => proofFile ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB` : '',
    [proofFile]
  );

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setProofFile(accepted[0]);
  }, [setProofFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'], 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
  });

  useEffect(() => {
    if (method === 'pay_later') setProofFile(undefined);
    if (method !== 'dp') { setDpDisplay(''); setValue('dpAmount', undefined); }
  }, [method, setProofFile, setValue]);

  const handleDpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setDpDisplay(''); setValue('dpAmount', undefined, { shouldValidate: true }); return; }
    const num = parseInt(raw, 10);
    setDpDisplay(new Intl.NumberFormat('id-ID').format(num));
    setValue('dpAmount', num, { shouldValidate: true });
  };

  const options: Array<{ value: 'pay_now' | 'dp' | 'pay_later'; title: string; desc: string; Icon: typeof Wallet }> = [
    { value: 'pay_now', title: 'Bayar Penuh', desc: 'Upload bukti transfer & order langsung diproses.', Icon: Wallet },
    { value: 'dp', title: 'Bayar DP', desc: 'Bayar uang muka, sisa dibayar sebelum diambil.', Icon: CreditCard },
    { value: 'pay_later', title: 'Bayar Nanti', desc: 'Order disimpan, bayar maksimal 1×24 jam.', Icon: Clock },
  ];

  const needsProof = method === 'pay_now' || method === 'dp';

  return (
    <div className="space-y-4">
      {/* Customer info — kept here so it's near payment */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="customerName">Nama Lengkap</Label>
          <Input id="customerName" className="mt-1.5 h-11" {...register('customerName')} />
          {errors.customerName && <p className="mt-1 text-sm text-destructive">{errors.customerName.message}</p>}
        </div>
        <div>
          <Label htmlFor="customerPhone">Nomor HP / WhatsApp</Label>
          <Input id="customerPhone" placeholder="081234567890" className="mt-1.5 h-11" {...register('customerPhone')} />
          {errors.customerPhone && <p className="mt-1 text-sm text-destructive">{errors.customerPhone.message}</p>}
        </div>
        <div>
          <Label htmlFor="customerEmail">Email <span className="text-muted-foreground">(opsional)</span></Label>
          <Input id="customerEmail" type="email" className="mt-1.5 h-11" {...register('customerEmail')} />
          {errors.customerEmail && <p className="mt-1 text-sm text-destructive">{errors.customerEmail.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Alamat Pengiriman</Label>
          <Textarea id="address" className="mt-1.5 resize-none" rows={2} placeholder="Jl. Contoh No. 1, Kota..." {...register('address')} />
          {errors.address && <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(({ value, title, desc, Icon }) => {
          const active = method === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue('paymentMethod', value, { shouldValidate: true })}
              className={cn(
                'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                active ? 'border-primary bg-primary/5 shadow-soft' : 'border-border hover:border-primary/40',
              )}
            >
              <span className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                active ? 'bg-gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {method === 'dp' && (
        <div className="space-y-1.5 animate-fade-in">
          <Label htmlFor="dpAmount">Jumlah DP (Rp)</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <Input
              id="dpAmount"
              inputMode="numeric"
              placeholder="Contoh: 150.000"
              value={dpDisplay}
              onChange={handleDpChange}
              className="h-11 pl-9"
            />
          </div>
          {errors.dpAmount && <p className="mt-1 text-sm text-destructive">{errors.dpAmount.message}</p>}
        </div>
      )}

      {needsProof && (
        <div className="space-y-2 animate-fade-in">
          <Label>Upload Bukti Transfer {method === 'dp' ? '(DP)' : ''}</Label>
          {!proofFile ? (
            <div
              {...getRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="mb-1.5 h-8 w-8 text-primary" />
              <p className="text-sm">Drag & drop bukti transfer</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, PDF — maks 10MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3 animate-scale-in">
              {proofPreview ? (
                <img src={proofPreview} alt="bukti transfer" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
                  <FileIcon className="h-7 w-7 text-success" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{proofFile.name}</p>
                <p className="text-xs text-muted-foreground">{proofSizeLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setProofFile(undefined)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
