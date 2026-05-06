import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { EyeletsModule } from './modules/eyelets/eyelets.module';
import { BannersModule } from './modules/banners/banners.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CashModule } from './modules/cash/cash.module';
import { CashDailyModule } from './modules/cash-daily/cash-daily.module';
import { StoresModule } from './modules/stores/stores.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CartsModule } from './modules/carts/carts.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadService } from './common/utils/upload.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('mongodbUri') }),
    }),
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'uploads'), serveRoot: '/uploads' }),
    AuthModule,
    UsersModule,
    RolesModule,
    MaterialsModule,
    EyeletsModule,
    BannersModule,
    OrdersModule,
    CashModule,
    CashDailyModule,
    StoresModule,
    ReportsModule,
    WhatsappModule,
    CustomersModule,
    CartsModule,
    SettingsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, UploadService],
})
export class AppModule { }
