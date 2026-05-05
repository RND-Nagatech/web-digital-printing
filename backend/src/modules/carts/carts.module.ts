import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { MaterialsModule } from '../materials/materials.module';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]), OrdersModule, MaterialsModule],
    controllers: [CartsController],
    providers: [CartsService],
    exports: [CartsService, MongooseModule],
})
export class CartsModule { }
