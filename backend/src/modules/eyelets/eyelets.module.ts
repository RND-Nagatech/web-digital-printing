import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Eyelet, EyeletSchema } from './schemas/eyelet.schema';
import { EyeletsController } from './eyelets.controller';
import { EyeletsService } from './eyelets.service';
@Module({ imports: [MongooseModule.forFeature([{ name: Eyelet.name, schema: EyeletSchema }])], controllers: [EyeletsController], providers: [EyeletsService] })
export class EyeletsModule {}
