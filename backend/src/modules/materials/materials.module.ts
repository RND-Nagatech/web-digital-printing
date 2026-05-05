import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from './schemas/material.schema';
import { Banner, BannerSchema } from '../banners/schemas/banner.schema';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
@Module({
    imports: [MongooseModule.forFeature([{ name: Material.name, schema: MaterialSchema }, { name: Banner.name, schema: BannerSchema }])],
    controllers: [MaterialsController],
    providers: [MaterialsService],
    exports: [MaterialsService, MongooseModule],
})
export class MaterialsModule { }
