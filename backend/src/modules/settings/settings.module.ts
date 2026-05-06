import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { OrderPolicy, OrderPolicySchema } from './schemas/order-policy.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: OrderPolicy.name, schema: OrderPolicySchema }, { name: Order.name, schema: OrderSchema }])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
