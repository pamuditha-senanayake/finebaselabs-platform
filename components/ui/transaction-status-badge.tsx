import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import type { TransactionStatus } from "@/lib/types";

const TRANSACTION_STATUS: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  SUCCESS: {
    label: "Success",
    className: "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]",
  },
  REFUND_REQUESTED: {
    label: "Refund Requested",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  REFUNDED: {
    label: "Refunded",
    className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]",
  },
};

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const config = TRANSACTION_STATUS[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      title={status}
    >
      {config.label}
    </Badge>
  );
}
