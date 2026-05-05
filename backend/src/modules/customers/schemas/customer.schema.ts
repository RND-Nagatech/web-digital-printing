import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ collection: 'tm_customer', timestamps: false, versionKey: false })
export class Customer {
    @Prop({ required: true, unique: true, trim: true })
    kode_customer!: string;

    @Prop({ required: true, unique: true, trim: true, lowercase: true })
    email!: string;

    @Prop({ required: true, unique: true, trim: true, uppercase: true })
    username!: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ required: true, trim: true })
    nama!: string;

    @Prop({ required: true, trim: true })
    alamat!: string;

    @Prop({ required: true, trim: true })
    no_hp!: string;

    @Prop({ default: true })
    is_active!: boolean;

    @Prop({ default: () => new Date() })
    created_at!: Date;

    @Prop({ default: () => new Date() })
    updated_at!: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
