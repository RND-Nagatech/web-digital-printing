import { useMemo } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { calculatePrice } from '@/utils/pricing';
import { formatIDR, formatNumber } from '@/utils/format';
import { ImageIcon, Receipt, Sparkles } from 'lucide-react';

type SummaryItem = {
  materialId: string;
  materialName: string;
  panjang: number;
  lebar: number;
  quantity: number;
  mataAyamLabel?: string;
  subtotal: number;
};

type OrderSummaryProps = {
  items?: SummaryItem[];
  grandTotal?: number;
};

export const OrderSummary = ({ items = [], grandTotal }: OrderSummaryProps) => {
  const { selectedMaterial, selectedOption, panjang, lebar, quantity } = useOrderStore();
  const breakdown = useMemo(
    () => calculatePrice(selectedMaterial, selectedOption, panjang, lebar, quantity),
    [selectedMaterial, selectedOption, panjang, lebar, quantity],
  );
  const hasItems = items.length > 0;
  const totalAmount = hasItems ? (grandTotal ?? items.reduce((sum, item) => sum + item.subtotal, 0)) : breakdown.total;
  const totalQty = hasItems ? items.reduce((sum, item) => sum + item.quantity, 0) : quantity;

  return (
    <div className="surface-card overflow-hidden">
      <div className="bg-gradient-primary px-5 py-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          <p className="text-sm font-semibold uppercase tracking-wide">Ringkasan Order</p>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight">{formatIDR(totalAmount)}</p>
        <p className="mt-1 text-xs opacity-80">
          {hasItems
            ? `${items.length} item (${totalQty} pcs) siap diproses`
            : 'Harga otomatis ter-update saat Anda mengubah pilihan'}
        </p>
      </div>

      <div className="p-5">
        {hasItems ? (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={`${item.materialId}-${idx}`} className="rounded-xl border bg-secondary/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{idx + 1}. {item.materialName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(item.panjang)} × {formatNumber(item.lebar)} m • Qty {item.quantity}
                    </p>
                    {item.mataAyamLabel && (
                      <p className="text-xs text-muted-foreground">Mata ayam: {item.mataAyamLabel}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{formatIDR(item.subtotal)}</p>
                </div>
              </div>
            ))}

            <div className="my-3 border-t" />
            <dl className="space-y-2.5 text-sm">
              <Row label="Jumlah item" value={`${items.length} item`} />
              <Row label="Total qty" value={`${totalQty} pcs`} />
              <Row label="Grand total" value={formatIDR(totalAmount)} bold />
            </dl>
          </div>
        ) : (
          <>
            {selectedMaterial ? (
              <div className="mb-4 flex gap-3 rounded-xl bg-secondary/40 p-3">
                {selectedMaterial.imageUrl ? (
                  <img src={selectedMaterial.imageUrl} alt={selectedMaterial.name} loading="lazy" width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {selectedMaterial.name}
                    {selectedMaterial.recommended && <Sparkles className="h-3 w-3 text-accent" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatIDR(selectedMaterial.pricePerSqm)} / m²</p>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
                Belum memilih bahan
              </div>
            )}

            <dl className="space-y-2.5 text-sm">
              <Row label="Ukuran" value={panjang && lebar ? `${formatNumber(panjang)} × ${formatNumber(lebar)} m` : '—'} />
              <Row label="Luas total" value={breakdown.area > 0 ? `${formatNumber(breakdown.area)} m²` : '—'} />
              <Row label="Jumlah" value={quantity > 0 ? `${quantity} pcs` : '—'} />
              <Row label="Mata ayam" value={selectedOption?.label ?? '—'} />
              <div className="my-3 border-t border-dashed" />
              <Row label="Harga bahan" value={formatIDR(breakdown.materialPrice)} />
              <Row label="Biaya tambahan" value={formatIDR(breakdown.optionPrice)} />
              <div className="my-3 border-t" />
              <Row label="Total" value={formatIDR(breakdown.total)} bold />
            </dl>
          </>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={bold ? 'text-base font-bold text-foreground' : 'font-medium text-foreground'}>{value}</dd>
  </div>
);
