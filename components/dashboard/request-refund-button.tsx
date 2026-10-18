"use client";

import { getRefundEligibility } from "@/lib/api/requests";
import type { Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RequestRefundButtonProps {
  transaction: Transaction;
  hasActiveRequest: boolean;
  onRequestRefund: (transactionId: string) => void;
}

export function RequestRefundButton({
  transaction,
  hasActiveRequest,
  onRequestRefund,
}: RequestRefundButtonProps) {
  const eligibility = getRefundEligibility(transaction);
  const blocked = hasActiveRequest || !eligibility.eligible;
  const reason = hasActiveRequest
    ? "An active refund request already exists for this transaction."
    : (eligibility.reason ?? "This transaction isn't eligible for a refund.");

  if (!blocked) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRequestRefund(transaction.id)}
        >
          Request Refund
        </Button>
        {eligibility.daysLeft !== null ? (
          <span className="text-xs text-muted-foreground">
            {eligibility.daysLeft}{" "}
            {eligibility.daysLeft === 1 ? "day" : "days"} left
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button type="button" variant="outline" size="sm" disabled>
              Request Refund
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
