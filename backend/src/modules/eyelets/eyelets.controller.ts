import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateEyeletDto } from './dto/create-eyelet.dto';
import { UpdateEyeletDto } from './dto/update-eyelet.dto';
import { EyeletsService } from './eyelets.service';

@Controller('eyelets')
export class EyeletsController {
  constructor(private readonly service: EyeletsService) {}
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 10));
    return this.service.findAll(p, l, search);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('eyelets:create')
  create(@Body() dto: CreateEyeletDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.create(dto, req.user?.username ?? 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('eyelets:update')
  update(@Param('id') id: string, @Body() dto: UpdateEyeletDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.update(id, dto, req.user?.username ?? 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('eyelets:delete')
  remove(@Param('id') id: string, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.remove(id, req.user?.username ?? 'system');
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('eyelets:update')
  restore(@Param('id') id: string, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.restore(id, req.user?.username ?? 'system');
  }
}
