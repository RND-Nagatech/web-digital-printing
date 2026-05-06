import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SizeDocument = HydratedDocument<Size>;

@Schema({ collection: 'tm_ukuran', timestamps: false })
export class Size {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  kode_ukuran!: string;

  @Prop({ required: true, trim: true })
  nama_ukuran!: string;

  @Prop({ default: '', trim: true })
  deskripsi?: string;

  @Prop({ default: 'CM', uppercase: true })
  satuan!: 'CM' | 'M';

  @Prop({ required: true, min: 0.1 })
  panjang_cm!: number;

  @Prop({ required: true, min: 0.1 })
  lebar_cm!: number;

  @Prop({ default: true })
  is_active!: boolean;

  @Prop({ default: false })
  status_delete!: boolean;

  @Prop({ default: () => new Date().toISOString() })
  created_at!: string;

  @Prop({ default: () => new Date().toISOString() })
  edited_date!: string;

  @Prop({ default: 'system' })
  edited_by!: string;
}

export const SizeSchema = SchemaFactory.createForClass(Size);
SizeSchema.index({ nama_ukuran: 1 });
