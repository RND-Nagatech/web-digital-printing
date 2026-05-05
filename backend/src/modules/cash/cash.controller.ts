import { Body, Controller, Get, Post, Put, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCashDto } from './dto/create-cash.dto';
import { UpdateCashDto } from './dto/update-cash.dto';
import { CashService } from './cash.service';

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly service: CashService) { }
  @Get()
  @Permissions('cash:read')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: 'PEMASUKAN' | 'PENGELUARAN' | 'ALL',
  ) {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      type: (type?.toUpperCase() as 'PEMASUKAN' | 'PENGELUARAN' | 'ALL') ?? 'ALL',
    });
  }
  @Post() @Permissions('cash:create') create(@Body() dto: CreateCashDto, @CurrentUser() user: { username: string }) { return this.service.create(dto, user?.username); }
  @Put(':id') @Permissions('cash:update') update(@Param('id') id: string, @Body() dto: UpdateCashDto) { return this.service.update(id, dto); }
}
