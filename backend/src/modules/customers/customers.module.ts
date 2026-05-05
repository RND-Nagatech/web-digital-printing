import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
    providers: [CustomersService],
    exports: [CustomersService, MongooseModule],
})
export class CustomersModule { }
