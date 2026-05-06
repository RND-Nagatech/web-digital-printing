import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrderStatus } from '../../../common/enums/order-status.enum';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true }) kode_bahan!: string;
  @Prop({ required: true }) nama_bahan!: string;
  @Prop({ required: true }) panjang!: number;
  @Prop({ required: true }) lebar!: number;
  @Prop({ required: true }) area!: number;
  @Prop({ default: '' }) mata_ayam!: string;
  @Prop({ default: '' }) design_file!: string;
  @Prop({ required: true, min: 1 }) quantity!: number;
  @Prop({ required: true }) harga_satuan!: number;
  @Prop({ required: true }) subtotal!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ collection: 'tt_order', timestamps: false })
export class Order {
  @Prop({ required: true, unique: true }) no_faktur!: string;
  @Prop({ index: true }) kode_customer?: string;
  @Prop({ required: true }) nama_customer!: string;
  @Prop({ required: true }) no_hp!: string;
  @Prop({ required: true }) alamat!: string;
  @Prop({ required: true }) kode_bahan!: string;
  @Prop({ required: true }) panjang!: number;
  @Prop({ required: true }) lebar!: number;
  @Prop({ required: true }) area!: number;
  @Prop({ default: '' }) mata_ayam!: string;
  @Prop({ required: true, min: 1 }) quantity!: number;
  @Prop() design_file?: string;
  @Prop({ required: true }) harga_total!: number;
  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.OPEN }) status!: OrderStatus;
  @Prop({ default: 'unpaid' }) payment_status!: string;
  @Prop() payment_proof?: string;
  @Prop({ type: String, enum: ['transfer', 'cash'] }) payment_settlement_method?: 'transfer' | 'cash';
  @Prop({ default: 0 }) dp_amount!: number;
  @Prop({ default: 0 }) sisa!: number;
  @Prop({ default: 0 }) dibayar!: number;
  @Prop() paid_date?: Date;
  @Prop({ default: () => new Date() }) created_at!: Date;
  @Prop() updated_date?: Date;
  @Prop() update_by?: string;
  @Prop({ type: [OrderItemSchema], default: [] }) items!: OrderItem[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ created_at: -1, status: 1 });
