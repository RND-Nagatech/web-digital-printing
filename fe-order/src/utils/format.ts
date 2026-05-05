export const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));

export const formatNumber = (value: number, digits = 2): string =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value);
