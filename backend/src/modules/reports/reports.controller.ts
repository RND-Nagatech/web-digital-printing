import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) { }

  @Get('summary') @Permissions('reports:read') summary() { return this.service.summary(); }

  @Get('finance/report')
  @Permissions('reports:read')
  financeReport(
    @Query('type') type: 'rekap' | 'detail' = 'detail',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getFinanceReport(type, from, to, search);
  }

  @Get('finance') @Permissions('reports:read') finance() { return this.service.finance(); }

  @Get('materials/top')
  @Permissions('reports:read')
  topMaterials(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTopMaterials({ from, to, search, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('sales/transactions')
  @Permissions('reports:read')
  salesTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getSalesTransactionsReport({ from, to, search });
  }
}
