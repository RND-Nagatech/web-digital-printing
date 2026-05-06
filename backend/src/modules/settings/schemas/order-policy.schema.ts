import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderPolicyDocument = HydratedDocument<OrderPolicy>;

@Schema({ collection: 'tm_settings', timestamps: false })
export class OrderPolicy {
  @Prop({ required: true, unique: true, default: 'order-policy' })
  key!: string;

  @Prop({ required: true, default: 2, min: 0 })
  max_unpaid_orders!: number;

  @Prop({ required: true, default: 24, min: 1 })
  unpaid_expiry_hours!: number;

  @Prop({ required: true, default: false })
  allow_process_unpaid!: boolean;

  @Prop({ required: true, default: true })
  allow_process_dp!: boolean;

  @Prop({ required: true, default: 3, min: 1 })
  suspend_after_auto_cancel_count!: number;

  @Prop({ required: true, default: 7, min: 1 })
  suspend_days!: number;

  @Prop({ default: 'system' })
  updated_by!: string;

  @Prop({ default: () => new Date().toISOString() })
  updated_date!: string;
}

export const OrderPolicySchema = SchemaFactory.createForClass(OrderPolicy);
