import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashDaily, CashDailySchema } from './schemas/cash-daily.schema';
import { CashDailyHistory, CashDailyHistorySchema } from './schemas/cash-daily-history.schema';
import { Cash, CashSchema } from '../cash/schemas/cash.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { CashDailyService } from './cash-daily.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CashDaily.name, schema: CashDailySchema },
            { name: CashDailyHistory.name, schema: CashDailyHistorySchema },
            { name: Cash.name, schema: CashSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    providers: [CashDailyService],
    exports: [CashDailyService],
})
export class CashDailyModule { }
