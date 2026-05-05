import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AutoReplyRule, AutoReplyRuleSchema } from './schemas/auto-reply-rule.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AutoReplyRule.name, schema: AutoReplyRuleSchema }])],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
