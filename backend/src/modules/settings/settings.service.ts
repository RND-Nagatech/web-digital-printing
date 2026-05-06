import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable, Subject } from 'rxjs';
import { UpdateOrderPolicyDto } from './dto/update-order-policy.dto';
import { OrderPolicy } from './schemas/order-policy.schema';
import { Order } from '../orders/schemas/order.schema';
import { OrderStatus } from '../../common/enums/order-status.enum';

export type OrderPolicyConfig = {
  max_unpaid_orders: number;
  unpaid_expiry_hours: number;
  allow_process_unpaid: boolean;
  allow_process_dp: boolean;
  suspend_after_auto_cancel_count: number;
  suspend_days: number;
  updated_date?: string;
  can_pay_later?: boolean;
  pay_later_suspended_until?: string | null;
  unpaid_open_orders?: number;
};

const DEFAULT_POLICY: OrderPolicyConfig = {
  max_unpaid_orders: 2,
  unpaid_expiry_hours: 24,
  allow_process_unpaid: false,
  allow_process_dp: true,
  suspend_after_auto_cancel_count: 3,
  suspend_days: 7,
};

@Injectable()
export class SettingsService {
  private readonly orderPolicyUpdated$ = new Subject<{ updated_date: string }>();

  constructor(
    @InjectModel(OrderPolicy.name) private readonly model: Model<OrderPolicy>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  getOrderPolicyUpdates(): Observable<{ updated_date: string }> {
    return this.orderPolicyUpdated$.asObservable();
  }

  async getOrderPolicy() {
    const row = await this.model.findOne({ key: 'order-policy' }).lean();
    if (!row) {
      await this.model.create({ key: 'order-policy', ...DEFAULT_POLICY, updated_by: 'system', updated_date: new Date().toISOString() });
      return { ...DEFAULT_POLICY, updated_date: new Date().toISOString() };
    }

    return {
      max_unpaid_orders: row.max_unpaid_orders ?? DEFAULT_POLICY.max_unpaid_orders,
      unpaid_expiry_hours: row.unpaid_expiry_hours ?? DEFAULT_POLICY.unpaid_expiry_hours,
      allow_process_unpaid: row.allow_process_unpaid ?? DEFAULT_POLICY.allow_process_unpaid,
      allow_process_dp: row.allow_process_dp ?? DEFAULT_POLICY.allow_process_dp,
      suspend_after_auto_cancel_count: row.suspend_after_auto_cancel_count ?? DEFAULT_POLICY.suspend_after_auto_cancel_count,
      suspend_days: row.suspend_days ?? DEFAULT_POLICY.suspend_days,
      updated_date: row.updated_date ?? new Date().toISOString(),
    } satisfies OrderPolicyConfig;
  }

  private async getPayLaterSuspensionInfo(kodeCustomer: string, policy: OrderPolicyConfig) {
    const threshold = Math.max(1, policy.suspend_after_auto_cancel_count || 3);
    const suspendDays = Math.max(1, policy.suspend_days || 7);
    const cancelled = await this.orderModel
      .find({
        kode_customer: kodeCustomer,
        status: 'cancelled',
        update_by: 'system:auto-cancel',
      })
      .sort({ updated_date: -1, created_at: -1 })
      .select({ updated_date: 1, created_at: 1 })
      .lean();

    const count = cancelled.length;
    if (count < threshold) {
      return { canPayLater: true, suspendedUntil: null as string | null };
    }

    const latest = cancelled[0];
    const latestDate =
      (latest?.updated_date ? new Date(latest.updated_date) : null) ??
      (latest?.created_at ? new Date(latest.created_at) : null);
    if (!latestDate || Number.isNaN(latestDate.getTime())) {
      return { canPayLater: true, suspendedUntil: null as string | null };
    }

    const suspendedUntilDate = new Date(latestDate.getTime() + suspendDays * 24 * 60 * 60 * 1000);
    const suspendedUntil = suspendedUntilDate.toISOString();
    const canPayLater = new Date() >= suspendedUntilDate;
    return { canPayLater, suspendedUntil: canPayLater ? null : suspendedUntil };
  }

  async getOrderPolicyForCustomer(kodeCustomer?: string) {
    const base = await this.getOrderPolicy();
    if (!kodeCustomer) {
      return { ...base, can_pay_later: true, pay_later_suspended_until: null, unpaid_open_orders: 0 };
    }
    const suspend = await this.getPayLaterSuspensionInfo(kodeCustomer, base);
    const unpaidOpenOrders = await this.orderModel.countDocuments({
      kode_customer: kodeCustomer,
      payment_status: 'unpaid',
      status: { $nin: [OrderStatus.CANCELLED, OrderStatus.SELESAI] },
    });
    const withinUnpaidLimit = base.max_unpaid_orders <= 0 || unpaidOpenOrders < base.max_unpaid_orders;
    const canPayLater = suspend.canPayLater && withinUnpaidLimit;
    return {
      ...base,
      can_pay_later: canPayLater,
      pay_later_suspended_until: canPayLater ? null : suspend.suspendedUntil,
      unpaid_open_orders: unpaidOpenOrders,
    } satisfies OrderPolicyConfig;
  }

  async updateOrderPolicy(dto: UpdateOrderPolicyDto, updatedBy = 'system') {
    const next = {
      key: 'order-policy',
      ...dto,
      updated_by: updatedBy,
      updated_date: new Date().toISOString(),
    };

    await this.model.updateOne({ key: 'order-policy' }, { $set: next }, { upsert: true });
    this.orderPolicyUpdated$.next({ updated_date: next.updated_date });
    return this.getOrderPolicy();
  }
}
