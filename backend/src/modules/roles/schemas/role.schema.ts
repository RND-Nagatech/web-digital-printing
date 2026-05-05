import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Role {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
