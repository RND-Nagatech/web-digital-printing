import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { hashPassword } from '../../common/utils/password.util';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { Customer } from './schemas/customer.schema';

type CounterDoc = { _id: string; seq: number };

@Injectable()
export class CustomersService {
    constructor(
        @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
        @InjectConnection() private readonly connection: Connection,
        private readonly configService: ConfigService,
    ) { }

    async register(dto: RegisterCustomerDto) {
        const email = dto.email.trim().toLowerCase();
        const username = dto.username.trim().toUpperCase();

        const [emailExists, usernameExists] = await Promise.all([
            this.customerModel.exists({ email }),
            this.customerModel.exists({ username }),
        ]);

        if (emailExists) throw new ConflictException('Email sudah terdaftar');
        if (usernameExists) throw new ConflictException('Username sudah terdaftar');

        const rounds = this.configService.get<number>('bcryptRounds', 10);
        const hashed = await hashPassword(dto.password, rounds);
        const kodeCustomer = await this.generateKodeCustomer();

        const created = await this.customerModel.create({
            kode_customer: kodeCustomer,
            email,
            username,
            password: hashed,
            nama: dto.nama.trim(),
            alamat: dto.alamat.trim(),
            no_hp: dto.no_hp.trim(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });

        return {
            id: String(created._id),
            kode_customer: created.kode_customer,
            email: created.email,
            username: created.username,
            nama: created.nama,
            alamat: created.alamat,
            no_hp: created.no_hp,
        };
    }

    async findById(id: string) {
        const customer = await this.customerModel.findOne({ _id: id, is_active: true }).lean();
        if (!customer) throw new NotFoundException('Customer tidak ditemukan');
        return customer;
    }

    findByEmail(email: string) {
        return this.customerModel.findOne({ email: email.trim().toLowerCase(), is_active: true }).lean();
    }

    findByUsername(username: string) {
        return this.customerModel.findOne({ username: username.trim().toUpperCase(), is_active: true }).lean();
    }

    private async generateKodeCustomer() {
        const result = await this.connection.collection<CounterDoc>('tm_counter').findOneAndUpdate(
            { _id: 'customer_code' },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: 'after' },
        );

        const seq = result?.seq ?? 1;
        return `C${String(seq).padStart(8, '0')}`;
    }
}
