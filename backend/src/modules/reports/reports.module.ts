import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cash, CashSchema } from '../cash/schemas/cash.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { CashDailyModule } from '../cash-daily/cash-daily.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }, { name: Cash.name, schema: CashSchema }]),
    CashDailyModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule { }
