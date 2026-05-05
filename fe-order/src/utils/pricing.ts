import type { Material, MataAyamOption, PriceBreakdown } from '@/types';

export function calculatePrice(
  material: Material | undefined,
  option: MataAyamOption | undefined,
  panjang: number,
  lebar: number,
  quantity = 1,
): PriceBreakdown {
  const area = Math.max(0, panjang) * Math.max(0, lebar);
  const qty = Math.max(1, quantity);
  const materialPrice = (material?.pricePerSqm ?? 0) * area * qty;
  const optionPrice = (option?.extraPricePerSqm ?? 0) * area * qty;
  return {
    area,
    materialPrice,
    optionPrice,
    total: materialPrice + optionPrice,
  };
}
