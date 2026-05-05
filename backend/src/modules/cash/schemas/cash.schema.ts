import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CashDocument = HydratedDocument<Cash>;

@Schema({ collection: 'tt_kas', timestamps: false })
export class Cash {
  @Prop({ enum: ['PEMASUKAN', 'PENGELUARAN'], required: true }) type!: 'PEMASUKAN' | 'PENGELUARAN';
  @Prop({ required: true, min: 0 }) jumlah!: number;
  @Prop({ required: true }) deskripsi!: string;
  @Prop({ required: true }) tanggal!: Date;
  @Prop({ required: true }) created_date!: string;
  @Prop() created_by?: string;
}

export const CashSchema = SchemaFactory.createForClass(Cash);
CashSchema.index({ tanggal: -1, type: 1 });
