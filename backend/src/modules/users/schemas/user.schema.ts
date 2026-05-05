import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RoleName } from '../../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'tm_user', timestamps: false, versionKey: false })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: String, enum: Object.values(RoleName), required: true })
  role!: RoleName;

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  role_id?: Types.ObjectId;

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

export const UserSchema = SchemaFactory.createForClass(User);
