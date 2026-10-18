import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/types";

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> =
  {
    PENDING_BRAIN_REVIEW: {
      label: "Pending Brain Review",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    },
    APPROVED: {
      label: "Approved",
      className: "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]",
    },
    COMPLETED: {
      label: "Completed",
      className: "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]",
    },
    REJECTED: {
      label: "Rejected",
      className: "border-red-500/40 bg-red-500/10 text-red-400",
    },
    FAILED: {
      label: "Failed",
      className: "border-red-500/40 bg-red-500/10 text-red-400",
    },
    PROCESSING: {
      label: "Processing",
      className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]",
    },
    ESCALATED_HUMAN: {
      label: "Under review",
      className: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    },
  };

export function getRequestStatusLabel(status: RequestStatus): string {
  return STATUS_CONFIG[status].label;
}

export function StatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

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
