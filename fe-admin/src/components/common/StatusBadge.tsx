import { OrderStatus, PaymentStatus } from "@/types/order";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/utils/constants";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const meta = ORDER_STATUSES.find((s) => s.value === status);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        COLOR_MAP[meta.color]
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
};

export const PaymentBadge = ({ status }: { status: PaymentStatus }) => {
  const meta = PAYMENT_STATUSES.find((s) => s.value === status);
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        COLOR_MAP[meta.color]
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
};
