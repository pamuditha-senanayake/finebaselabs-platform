import type { RefundRequest, Transaction } from "@/lib/types";
import {
  daysSincePurchase,
  usePortalStore,
  type CreateRefundRequestInput,
} from "@/lib/store";
import { MAX_REJECTED_REFUND_ATTEMPTS } from "@/lib/constants";
import { sendToFineBrain } from "@/lib/api/finebrain";
import { clone, delay } from "@/lib/api/_shared";

export type SubmitRefundInput = CreateRefundRequestInput;

export interface RefundEligibility {
  eligible: boolean;
  reason: string | null;
  daysLeft: number | null;
}

export function getRefundEligibility(
  transaction: Transaction | null | undefined,
): RefundEligibility {
  if (!transaction) {
    return { eligible: false, reason: "Transaction not found.", daysLeft: null };
  }

  if (transaction.status === "REFUNDED") {
    return {
      eligible: false,
      reason: "This transaction has already been refunded.",
      daysLeft: null,
    };
  }

  if (transaction.status === "REFUND_REQUESTED") {
    return {
      eligible: false,
      reason: "A refund is already in progress for this transaction.",
      daysLeft: null,
    };
  }

  if (transaction.status !== "SUCCESS") {
    return {
      eligible: false,
      reason: "This transaction is no longer eligible for a refund.",
      daysLeft: null,
    };
  }

  const rejectedCount = usePortalStore
    .getState()
    .requests.filter(
      (request) =>
        request.transactionId === transaction.id &&
        request.status === "REJECTED",
    ).length;

  if (rejectedCount >= MAX_REJECTED_REFUND_ATTEMPTS) {
    return {
      eligible: false,
      reason: "Refund limit reached, contact support",
      daysLeft: null,
    };
  }

  if (!transaction.productId) {
    return { eligible: true, reason: null, daysLeft: null };
  }

  const product = usePortalStore
    .getState()
    .products.find((item) => item.id === transaction.productId);

  if (!product) {
    return { eligible: true, reason: null, daysLeft: null };
  }

  const daysSince = daysSincePurchase(transaction.createdAt);
  const daysLeft = Math.max(0, product.refundWindowDays - daysSince);

  if (!product.refundable) {
    return { eligible: false, reason: "Not refundable", daysLeft };
  }

  if (daysSince > product.refundWindowDays) {
    return {
      eligible: false,
      reason: `Refund window of ${product.refundWindowDays} days has passed`,
      daysLeft: 0,
    };
  }

  return { eligible: true, reason: null, daysLeft };
}

export async function listRefundRequests(
  userId: string,
): Promise<RefundRequest[]> {
  await delay();

  const { requests } = usePortalStore.getState();
  const source = requests.filter((request) => request.userId === userId);

  return clone(source).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getRefundRequest(
  id: string,
): Promise<RefundRequest | null> {
  await delay();

  const match = usePortalStore
    .getState()
    .requests.find((request) => request.id === id);

  return match ? clone(match) : null;
}

export async function submitRefund(
  input: SubmitRefundInput,
): Promise<RefundRequest> {
  await delay();

  const request = usePortalStore.getState().createRefundRequest(input);

  await sendToFineBrain(request);

  return clone(request);
}

