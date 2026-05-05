import { useFormContext } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMataAyam } from '@/hooks/useMaterials';
import { useOrderStore } from '@/store/orderStore';
import { formatIDR } from '@/utils/format';
import type { OrderFormValues } from '../orderSchema';

export const OptionsSection = () => {
  const { data: options, isLoading } = useMataAyam();
  const { setValue, watch, formState: { errors } } = useFormContext<OrderFormValues>();
  const value = watch('mataAyamId');
  const setOption = useOrderStore((s) => s.setOption);
  const selected = options?.find((o) => o.id === value);

  if (isLoading) return <Skeleton className="h-12 w-full" />;

  const handleChange = (id: string) => {
    setValue('mataAyamId', id, { shouldValidate: true, shouldDirty: true });
    setOption(options?.find((o) => o.id === id));
  };

  return (
    <div className="space-y-2">
      <Select value={value || ''} onValueChange={handleChange}>
        <SelectTrigger className="h-12 text-base">
          <SelectValue placeholder="Pilih opsi mata ayam..." />
        </SelectTrigger>
        <SelectContent>
          {options?.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
              {o.extraPricePerSqm > 0 && (
                <span className="ml-1 text-muted-foreground">(+{formatIDR(o.extraPricePerSqm)}/m²)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.mataAyamId && <p className="text-sm text-destructive">{errors.mataAyamId.message}</p>}
      {selected && <p className="text-sm text-muted-foreground">{selected.description}</p>}
    </div>
  );
};
