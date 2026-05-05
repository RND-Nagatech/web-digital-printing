import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false })
export class CartOrderItem {
    @Prop({ required: true }) kode_bahan!: string;
    @Prop({ required: true }) panjang!: number;
    @Prop({ required: true }) lebar!: number;
    @Prop({ required: true, min: 1 }) quantity!: number;
    @Prop({ default: '' }) mata_ayam!: string;
    @Prop({ default: '' }) nama_bahan!: string;
    @Prop({ default: '' }) gambar_bahan!: string;
}

export const CartOrderItemSchema = SchemaFactory.createForClass(CartOrderItem);

@Schema({ collection: 'tt_cart', timestamps: false })
export class Cart {
    @Prop({ required: true, index: true }) kode_customer!: string;
    @Prop({ required: true }) nama_customer!: string;
    @Prop({ required: true }) no_hp!: string;
    @Prop({ required: true }) alamat!: string;
    @Prop({ type: [CartOrderItemSchema], default: [] }) items!: CartOrderItem[];
    @Prop({ default: 'pay_later' }) payment_method!: 'pay_now' | 'dp' | 'pay_later';
    @Prop({ default: 0 }) dp_amount!: number;
    @Prop() notes?: string;
    @Prop() design_file?: string;
    @Prop() payment_proof?: string;
    @Prop({ default: 0 }) estimated_total!: number;
    @Prop({ default: () => new Date() }) created_at!: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ kode_customer: 1, created_at: -1 });
