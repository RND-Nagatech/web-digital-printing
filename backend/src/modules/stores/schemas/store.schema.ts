import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StoreDocument = HydratedDocument<Store>;

@Schema({ collection: 'tm_toko', timestamps: false, versionKey: false })
export class Store {
    @Prop({ required: true, unique: true, trim: true, index: true })
    kode_toko!: string;

    @Prop({ required: true, trim: true, index: true })
    nama_toko!: string;

    @Prop({ required: true, trim: true })
    no_hp!: string;

    @Prop({ required: true, trim: true })
    alamat!: string;

    @Prop({ required: true })
    created_at!: string;

    @Prop({ type: String, default: '-' })
    edited_by!: string;

    @Prop({ type: String, default: '-' })
    edited_date!: string;
}

export const StoreSchema = SchemaFactory.createForClass(Store);
StoreSchema.index({ nama_toko: 'text', alamat: 'text', no_hp: 'text', kode_toko: 'text' });
