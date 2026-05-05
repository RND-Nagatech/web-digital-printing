import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EyeletDocument = HydratedDocument<Eyelet>;

@Schema({ collection: 'tm_mata_ayam', timestamps: false, versionKey: false })
export class Eyelet {
  @Prop({ required: true, unique: true, trim: true, index: true })
  nama_mata_ayam!: string;

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
  created_date!: string;
}

export const EyeletSchema = SchemaFactory.createForClass(Eyelet);
