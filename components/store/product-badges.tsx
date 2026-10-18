import { BanIcon, ShieldCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG: Record<ProductType, { label: string; className: string }> = {
  SERVICE: {
    label: "Service",
    className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]",
  },
  PRODUCT: {
    label: "Product",
    className: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  },
};

export function getProductTypeLabel(type: ProductType): string {
  return TYPE_CONFIG[type].label;
}

export function ProductTypeBadge({
  type,
  className,
}: {
  type: ProductType;
  className?: string;
}) {
  const config = TYPE_CONFIG[type];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export function getRefundPolicyLabel(
  refundable: boolean,
  refundWindowDays: number,
): string {
  if (!refundable) return "Non-refundable";
  return `Refundable ${refundWindowDays} days`;
}

export function RefundBadge({
  refundable,
  refundWindowDays,
  className,
}: {
  refundable: boolean;
  refundWindowDays: number;
  className?: string;
}) {
  const Icon = refundable ? ShieldCheckIcon : BanIcon;

  return (
    <Badge
      variant="outline"
      className={cn(
        refundable
          ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
          : "border-slate-800/60 bg-slate-950/40 text-muted-foreground",
        className,
      )}
    >
      <Icon />
      {getRefundPolicyLabel(refundable, refundWindowDays)}
    </Badge>
  );
}
