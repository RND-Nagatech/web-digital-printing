import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AutoReplyRuleDocument = HydratedDocument<AutoReplyRule>;

@Schema({ timestamps: false, versionKey: false })
export class AutoReplyRule {
  @Prop({ required: true, trim: true, index: true })
  keyword!: string;

  @Prop({ required: true, trim: true })
  reply!: string;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  @Prop({ type: String, enum: ['exact', 'contains'], default: 'contains' })
  matchType!: 'exact' | 'contains';

  @Prop({ type: Date, default: Date.now, index: true })
  created_at!: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at!: Date;
}

export const AutoReplyRuleSchema = SchemaFactory.createForClass(AutoReplyRule);
