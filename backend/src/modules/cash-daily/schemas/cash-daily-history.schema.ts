import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CashDailyHistoryDocument = HydratedDocument<CashDailyHistory>;

/** th_cash_daily — arsip harian. Setiap akhir hari, tt_cash_daily di-rollover ke sini. */
@Schema({ collection: 'th_cash_daily', timestamps: false })
export class CashDailyHistory {
    @Prop({ required: true, unique: true }) tanggal!: string; // YYYY-MM-DD (WIB)
    @Prop({ required: true, default: 0 }) saldo_akhir!: number;
    @Prop({ required: true, default: 0, min: 0 }) saldo_awal!: number;
    @Prop({ required: true, default: 0, min: 0 }) uang_keluar!: number;
    @Prop({ required: true, default: 0, min: 0 }) uang_masuk!: number;
    @Prop({ required: true, default: () => new Date().toISOString() }) closed_at!: string;
}

export const CashDailyHistorySchema = SchemaFactory.createForClass(CashDailyHistory);
