import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CashDailyDocument = HydratedDocument<CashDaily>;

/** tt_cash_daily — hanya menyimpan 1 record untuk hari ini (WIB). */
@Schema({ collection: 'tt_cash_daily', timestamps: false })
export class CashDaily {
    @Prop({ required: true, unique: true }) tanggal!: string; // YYYY-MM-DD (WIB)
    @Prop({ required: true, default: 0 }) saldo_akhir!: number;
    @Prop({ required: true, default: 0, min: 0 }) saldo_awal!: number;
    @Prop({ required: true, default: 0, min: 0 }) uang_keluar!: number;
    @Prop({ required: true, default: 0, min: 0 }) uang_masuk!: number;
}

export const CashDailySchema = SchemaFactory.createForClass(CashDaily);
