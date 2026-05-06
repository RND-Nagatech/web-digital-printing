export interface OrderPolicyDto {
  max_unpaid_orders: number;
  unpaid_expiry_hours: number;
  allow_process_unpaid: boolean;
  allow_process_dp: boolean;
  suspend_after_auto_cancel_count: number;
  suspend_days: number;
  updated_date?: string;
}
