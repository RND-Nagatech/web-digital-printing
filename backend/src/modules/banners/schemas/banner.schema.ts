import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BannerDocument = HydratedDocument<Banner>;

@Schema({ collection: 'tm_banner', timestamps: false, versionKey: false })
export class Banner {
  @Prop({ required: true, trim: true, index: true })
  kode_bahan!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true }) image_url!: string;

  @Prop({ type: String, default: null })
  deleted_by!: string | null;

  @Prop({ type: String, default: null })
  deleted_date!: string | null;

  @Prop({ type: String, default: null })
  created_at!: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
