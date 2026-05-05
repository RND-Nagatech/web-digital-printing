import { useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaterials } from '@/hooks/useMaterials';
import { useOrderStore } from '@/store/orderStore';
import { formatIDR } from '@/utils/format';
import type { OrderFormValues } from '../orderSchema';
import { CheckCircle2, ImageIcon, Sparkles, ZoomIn } from 'lucide-react';

export const MaterialSection = () => {
  const { data: materials, isLoading } = useMaterials();
  const { setValue, watch, formState: { errors } } = useFormContext<OrderFormValues>();
  const materialId = watch('materialId');
  const setMaterial = useOrderStore((s) => s.setMaterial);
  const selected = materials?.find((m) => m.id === materialId);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!materialId || !materials?.length) return;
    const latestSelected = materials.find((m) => m.id === materialId);
    if (latestSelected) setMaterial(latestSelected);
  }, [materialId, materials, setMaterial]);

  const handleChange = (id: string) => {
    setValue('materialId', id, { shouldValidate: true, shouldDirty: true });
    setMaterial(materials?.find((m) => m.id === id));
  };

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      <Select value={materialId || ''} onValueChange={handleChange}>
        <SelectTrigger className="h-12 text-base">
          <SelectValue placeholder="Pilih bahan banner..." />
        </SelectTrigger>
        <SelectContent>
          {materials?.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex items-center gap-2">
                {m.recommended && <Sparkles className="h-3.5 w-3.5 text-accent" />}
                <span>{m.name}</span>
                <span className="text-muted-foreground">— {formatIDR(m.pricePerSqm)}/m²</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.materialId && <p className="text-sm text-destructive">{errors.materialId.message}</p>}

      {selected && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-secondary/40 p-3 sm:flex-row animate-scale-in">
          {selected.imageUrl ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="group relative h-28 w-full shrink-0 overflow-hidden rounded-lg sm:w-28"
            >
              <img
                src={selected.imageUrl}
                alt={selected.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-lg bg-secondary sm:w-28">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{selected.name}</h4>
              {selected.recommended && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  Rekomendasi
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" /> {formatIDR(selected.pricePerSqm)} / m²
            </p>
          </div>
        </div>
      )}

      {selected?.imageUrl && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl p-2">
            <img
              src={selected.imageUrl}
              alt={selected.name}
              className="w-full rounded-lg object-contain max-h-[75vh]"
            />
            <p className="mt-2 text-center text-sm font-semibold text-foreground">{selected.name}</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
