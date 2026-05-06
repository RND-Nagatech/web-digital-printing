import { z } from 'zod';

const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

export const orderFormSchema = z.object({
  customerName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  customerPhone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Format nomor HP tidak valid (contoh: 081234567890)'),
  customerEmail: z.string().trim().email('Email tidak valid').max(120).optional().or(z.literal('')),
  address: z.string().trim().min(3, 'Alamat minimal 3 karakter').max(200, 'Alamat maks 200 karakter'),
  materialId: z.string().min(1, 'Pilih bahan terlebih dahulu'),
  sizeMode: z.enum(['preset', 'custom']).default('custom'),
  sizePresetId: z.string().optional(),
  panjang: z.coerce.number().positive('Panjang harus lebih dari 0').max(100, 'Maks 100 m'),
  lebar: z.coerce.number().positive('Lebar harus lebih dari 0').max(100, 'Maks 100 m'),
  quantity: z.coerce.number().int('Harus bilangan bulat').positive('Minimal 1').max(9999, 'Maks 9999'),
  mataAyamId: z.string().min(1, 'Pilih opsi mata ayam'),
  notes: z.string().max(500, 'Catatan maks 500 karakter').optional(),
  paymentMethod: z.enum(['pay_now', 'dp', 'pay_later']),
  dpAmount: z.coerce.number().positive('DP harus lebih dari 0').optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'dp' && (!data.dpAmount || data.dpAmount <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Masukkan jumlah DP', path: ['dpAmount'] });
  }
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
