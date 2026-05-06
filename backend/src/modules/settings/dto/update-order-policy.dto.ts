import { IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateOrderPolicyDto {
  @IsInt() @Min(0) max_unpaid_orders!: number;
  @IsInt() @Min(1) unpaid_expiry_hours!: number;
  @IsBoolean() allow_process_unpaid!: boolean;
  @IsBoolean() allow_process_dp!: boolean;
  @IsInt() @Min(1) suspend_after_auto_cancel_count!: number;
  @IsInt() @Min(1) suspend_days!: number;
}
