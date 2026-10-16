"use client";

import { useCallback, useState } from "react";

import type { Transaction } from "@/lib/types";
import { RefundModal } from "@/components/dashboard/refund-modal";

export function useRefundModal() {
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const openRefundModal = useCallback((next: Transaction) => {
    setTransaction(next);
  }, []);

  const refundModal = (
    <RefundModal
      open={transaction !== null}
      transaction={transaction}
      onOpenChange={(next) => {
        if (!next) setTransaction(null);
      }}
    />
  );

  return { openRefundModal, refundModal };
}
