import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { Material, MaterialSchema } from '../materials/schemas/material.schema';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }, { name: Material.name, schema: MaterialSchema }])],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
