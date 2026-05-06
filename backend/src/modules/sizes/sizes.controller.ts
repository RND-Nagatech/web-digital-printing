import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { SizesService } from './sizes.service';

@Controller('sizes')
export class SizesController {
  constructor(private readonly service: SizesService) {}

  @Get('public')
  @UseGuards(JwtAuthGuard)
  findPublic() {
    return this.service.findPublic();
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sizes:read')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 10));
    return this.service.findAll(p, l, search);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sizes:create')
  create(@Body() dto: CreateSizeDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.create(dto, req.user?.username ?? 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sizes:update')
  update(@Param('id') id: string, @Body() dto: UpdateSizeDto, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.update(id, dto, req.user?.username ?? 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sizes:delete')
  remove(@Param('id') id: string, @Req() req: Request & { user?: { username?: string } }) {
    return this.service.remove(id, req.user?.username ?? 'system');
  }
}
