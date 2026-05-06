import { Body, Controller, Get, MessageEvent, Put, Req, Sse, UseGuards } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdateOrderPolicyDto } from './dto/update-order-policy.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('order-policy')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings:read')
  getOrderPolicy() {
    return this.service.getOrderPolicy();
  }

  @Get('order-policy/public')
  @UseGuards(JwtAuthGuard)
  getOrderPolicyPublic(@Req() req: any) {
    const kodeCustomer = req.user?.actor === 'customer' ? req.user?.kode_customer : undefined;
    return this.service.getOrderPolicyForCustomer(kodeCustomer);
  }

  @Put('order-policy')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings:update')
  updateOrderPolicy(@Body() dto: UpdateOrderPolicyDto, @Req() req: any) {
    return this.service.updateOrderPolicy(dto, req.user?.username ?? 'system');
  }

  @Sse('order-policy/stream')
  orderPolicyStream(): Observable<MessageEvent> {
    return this.service.getOrderPolicyUpdates().pipe(
      map((payload) => ({ data: payload })),
    );
  }
}
