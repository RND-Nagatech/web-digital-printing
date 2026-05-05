import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MaterialDocument = HydratedDocument<Material>;

@Schema({ collection: 'tm_bahan', timestamps: false, versionKey: false })
export class Material {
  @Prop({ required: true, unique: true, trim: true, index: true })
  kode_bahan!: string;

  @Prop({ required: true, trim: true, index: true })
  nama_bahan!: string;

  @Prop()
  deskripsi?: string;

  @Prop({ required: true, min: 0 })
  harga_per_meter!: number;

  @Prop({ default: true }) is_active!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  status_delete!: boolean;

  @Prop({ type: String, default: null })
  edited_by!: string | null;

  @Prop({ type: String, default: null })
  edited_date!: string | null;

  @Prop({ type: String, default: null })
  deleted_by!: string | null;

  @Prop({ type: String, default: null })
  deleted_date!: string | null;

  @Prop({ type: String, default: null, index: true })
  created_at!: string;
}

export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.index({ nama_bahan: 1, status_delete: 1 });
