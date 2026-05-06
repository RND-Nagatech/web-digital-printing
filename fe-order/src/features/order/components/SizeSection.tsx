import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrderStore } from '@/store/orderStore';
import { formatNumber } from '@/utils/format';
import type { OrderFormValues } from '../orderSchema';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProdukService } from '@/services/produk.service';
import type { SizePreset } from '@/types';

export const SizeSection = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OrderFormValues>();
  const panjang = Number(watch('panjang')) || 0;
  const lebar = Number(watch('lebar')) || 0;
  const quantity = Number(watch('quantity')) || 1;
  const sizeMode = watch('sizeMode') || 'custom';
  const sizePresetId = watch('sizePresetId') || '';
  const setSize = useOrderStore((s) => s.setSize);
  const setQuantity = useOrderStore((s) => s.setQuantity);
  const [presets, setPresets] = useState<SizePreset[]>([]);

  useEffect(() => { setSize(panjang, lebar); }, [panjang, lebar, setSize]);
  useEffect(() => { setQuantity(quantity); }, [quantity, setQuantity]);

  useEffect(() => {
    void ProdukService.getSizePresets()
      .then((rows) => setPresets(rows))
      .catch(() => setPresets([]));
  }, []);

  useEffect(() => {
    if (sizeMode !== 'preset') return;
    const preset = presets.find((x) => x.id === sizePresetId);
    if (!preset) return;
    const p = Number((preset.panjangCm / 100).toFixed(4));
    const l = Number((preset.lebarCm / 100).toFixed(4));
    setValue('panjang', p, { shouldValidate: true });
    setValue('lebar', l, { shouldValidate: true });
  }, [sizeMode, sizePresetId, presets, setValue]);

  const area = panjang * lebar;
  const sanitizeDecimal = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const [head, ...tail] = cleaned.split('.');
    return tail.length > 0 ? `${head}.${tail.join('')}` : head;
  };
  const sanitizeInteger = (value: string) => value.replace(/[^0-9]/g, '');

  const selectedPreset = useMemo(() => presets.find((x) => x.id === sizePresetId), [presets, sizePresetId]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant={sizeMode === 'preset' ? 'default' : 'outline'}
          className={sizeMode === 'preset' ? 'gradient-primary text-primary-foreground' : ''}
          onClick={() => setValue('sizeMode', 'preset', { shouldValidate: true })}
        >
          Pilih Ukuran Standar
        </Button>
        <Button
          type="button"
          variant={sizeMode === 'custom' ? 'default' : 'outline'}
          className={sizeMode === 'custom' ? 'gradient-primary text-primary-foreground' : ''}
          onClick={() => setValue('sizeMode', 'custom', { shouldValidate: true })}
        >
          Input Ukuran Custom
        </Button>
      </div>

      {sizeMode === 'preset' && (
        <div className="sm:col-span-2">
          <Label>Ukuran Standar</Label>
          <Select value={sizePresetId} onValueChange={(v) => setValue('sizePresetId', v, { shouldValidate: true })}>
            <SelectTrigger className="mt-1.5 h-11">
              <SelectValue placeholder="Pilih ukuran (A4/A3/dll)" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.code} - {p.name} ({p.panjangCm} x {p.lebarCm} cm)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPreset && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">Terisi otomatis: {selectedPreset.panjangCm / 100} m x {selectedPreset.lebarCm / 100} m</p>
              {selectedPreset.description?.trim() && (
                <p className="mt-1 text-sm text-muted-foreground">{selectedPreset.description}</p>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="panjang">Panjang (meter)</Label>
        <Input
          id="panjang"
          inputMode="decimal"
          placeholder="Silahkan input panjang (meter)"
          className="mt-1.5 h-11"
          disabled={sizeMode === 'preset'}
          onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.value = sanitizeDecimal(target.value);
          }}
          {...register('panjang')}
        />
        {errors.panjang && <p className="mt-1 text-sm text-destructive">{errors.panjang.message}</p>}
      </div>
      <div>
        <Label htmlFor="lebar">Lebar (meter)</Label>
        <Input
          id="lebar"
          inputMode="decimal"
          placeholder="Silahkan input lebar (meter)"
          className="mt-1.5 h-11"
          disabled={sizeMode === 'preset'}
          onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.value = sanitizeDecimal(target.value);
          }}
          {...register('lebar')}
        />
        {errors.lebar && <p className="mt-1 text-sm text-destructive">{errors.lebar.message}</p>}
      </div>
      <div>
        <Label htmlFor="quantity">Jumlah (pcs)</Label>
        <Input
          id="quantity"
          inputMode="numeric"
          placeholder="Silahkan input quantity"
          className="mt-1.5 h-11"
          onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); }}
          onInput={(e) => {
            const target = e.currentTarget;
            target.value = sanitizeInteger(target.value);
          }}
          {...register('quantity')}
        />
        {errors.quantity && <p className="mt-1 text-sm text-destructive">{errors.quantity.message}</p>}
      </div>
      <div className="sm:col-span-2 rounded-xl bg-primary/5 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total luas:</span>{' '}
        <span className="font-semibold text-primary">{formatNumber(area)} m²</span>
        {quantity > 1 && (
          <span className="ml-2 text-muted-foreground">× {quantity} pcs</span>
        )}
      </div>
    </div>
  );
};
