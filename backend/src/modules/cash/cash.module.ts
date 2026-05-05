import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cash, CashSchema } from './schemas/cash.schema';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { CashDailyModule } from '../cash-daily/cash-daily.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Cash.name, schema: CashSchema }]), CashDailyModule],
  controllers: [CashController],
  providers: [CashService],
  exports: [MongooseModule],
})
export class CashModule { }
