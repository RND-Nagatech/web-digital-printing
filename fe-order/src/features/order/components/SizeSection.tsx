import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrderStore } from '@/store/orderStore';
import { formatNumber } from '@/utils/format';
import type { OrderFormValues } from '../orderSchema';
import { useEffect } from 'react';

export const SizeSection = () => {
  const { register, watch, formState: { errors } } = useFormContext<OrderFormValues>();
  const panjang = Number(watch('panjang')) || 0;
  const lebar = Number(watch('lebar')) || 0;
  const quantity = Number(watch('quantity')) || 1;
  const setSize = useOrderStore((s) => s.setSize);
  const setQuantity = useOrderStore((s) => s.setQuantity);

  useEffect(() => { setSize(panjang, lebar); }, [panjang, lebar, setSize]);
  useEffect(() => { setQuantity(quantity); }, [quantity, setQuantity]);

  const area = panjang * lebar;
  const sanitizeDecimal = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const [head, ...tail] = cleaned.split('.');
    return tail.length > 0 ? `${head}.${tail.join('')}` : head;
  };
  const sanitizeInteger = (value: string) => value.replace(/[^0-9]/g, '');

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="panjang">Panjang (meter)</Label>
        <Input
          id="panjang"
          inputMode="decimal"
          placeholder="Silahkan input panjang (meter)"
          className="mt-1.5 h-11"
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
