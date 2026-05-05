import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AutoReplyDto } from './dto/auto-reply.dto';
import { SendWaDto } from './dto/send-wa.dto';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Get('status')
  @Permissions('whatsapp:send')
  status() {
    return this.service.status();
  }

  @Post('connect')
  @Permissions('whatsapp:send')
  connect() {
    return this.service.connect();
  }

  @Get('qr')
  @Permissions('whatsapp:send')
  qr() {
    return this.service.qr();
  }

  @Post('disconnect')
  @Permissions('whatsapp:send')
  disconnect() {
    return this.service.disconnect();
  }

  @Post('send')
  @Permissions('whatsapp:send')
  send(@Body() dto: SendWaDto) {
    return this.service.send(dto);
  }

  @Post('auto-reply')
  @Permissions('whatsapp:auto-reply')
  autoReply(@Body() dto: AutoReplyDto) {
    return this.service.setAutoReply(dto);
  }

  @Get('auto-reply')
  @Permissions('whatsapp:auto-reply')
  findAutoReply(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAutoReply(Number(page ?? 1), Number(limit ?? 10), search ?? '');
  }

  @Put('auto-reply/:id')
  @Permissions('whatsapp:auto-reply')
  updateAutoReply(@Param('id') id: string, @Body() dto: AutoReplyDto) {
    return this.service.updateAutoReply(id, dto);
  }

  @Delete('auto-reply/:id')
  @Permissions('whatsapp:auto-reply')
  deleteAutoReply(@Param('id') id: string) {
    return this.service.deleteAutoReply(id);
  }
}
