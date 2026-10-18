import type {
  ProductType,
  RefundRequest,
  TransactionStatus,
} from "@/lib/types";
import { daysSincePurchase, usePortalStore } from "@/lib/store";
import { mockUsers } from "@/lib/mock-data";
import { clone, createId } from "@/lib/api/_shared";

export type FineBrainDecisionStatus = "APPROVED" | "REJECTED" | "ESCALATED_HUMAN";

export interface FineBrainCustomer {
  id: string;
  name: string;
  email: string;
}

export interface FineBrainTransaction {
  id: string;
  reference: string;
  amount: number; // decimal major units (e.g. 299.00) — FineBrain boundary
  currency: string;
  status: TransactionStatus;
  description: string;
  merchant: string | null;
  created_at: string;
}

export interface FineBrainProduct {
  product_id: string;
  name: string;
  type: ProductType;
  price: number; // decimal major units (e.g. 49.00) — FineBrain boundary
  purchase_date: string;
  days_since_purchase: number;
  refund_window_days: number;
}

export interface RefundEvaluationRequest {
  type: "REFUND_EVALUATION_REQUEST";
  request_id: string;
  reason: string;
  requested_amount: number; // decimal major units (e.g. 299.00) — FineBrain boundary
  currency: string;
  customer: FineBrainCustomer;
  transaction: FineBrainTransaction | null;
  product: FineBrainProduct | null;
  created_at: string;
}

export interface FineBrainCallbackPayload {
  request_id: string;
  status: FineBrainDecisionStatus;
  confidence_score: number;
  decision_summary: string;
  timestamp: string;
}

export async function sendToFineBrain(
  payload: RefundRequest,
): Promise<RefundEvaluationRequest> {
  const { transactions, products } = usePortalStore.getState();
  const transaction = transactions.find(
    (item) => item.id === payload.transactionId,
  );
  const product =
    transaction?.productId !== undefined
      ? products.find((item) => item.id === transaction.productId)
      : undefined;
  const customer = mockUsers.find((user) => user.id === payload.userId);

  // The store keeps amounts in minor units (cents). FineBrain's documented
  // payload uses decimal major units (e.g. 299.00) — convert only here, at
  // this boundary; everything internal stays in cents.
  const toMajor = (minor: number) => minor / 100;

  const request: RefundEvaluationRequest = {
    type: "REFUND_EVALUATION_REQUEST",
    request_id: payload.id,
    reason: payload.reason,
    requested_amount: toMajor(payload.amount),
    currency: payload.currency,
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email }
      : { id: payload.userId, name: "", email: "" },
    transaction: transaction
      ? {
          id: transaction.id,
          reference: transaction.reference,
          amount: toMajor(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          merchant: transaction.merchant,
          created_at: transaction.createdAt.toISOString(),
        }
      : null,
    product:
      product && transaction
        ? {
            product_id: product.id,
            name: product.name,
            type: product.type,
            price: toMajor(product.price),
            purchase_date: transaction.createdAt.toISOString(),
            days_since_purchase: daysSincePurchase(transaction.createdAt),
            refund_window_days: product.refundWindowDays,
          }
        : null,
    created_at: payload.createdAt.toISOString(),
  };

  // TODO: POST this payload to the real FineBrain evaluate endpoint (via the backend).

  return request;
}

export type ApplyBrainDecisionResult =
  | { ok: true; request: RefundRequest }
  | { ok: false; reason: string };

export async function applyBrainDecision(
  callbackPayload: FineBrainCallbackPayload,
): Promise<ApplyBrainDecisionResult> {
  const store = usePortalStore.getState();
  const request = store.requests.find(
    (item) => item.id === callbackPayload.request_id,
  );
  if (!request) {
    return { ok: false, reason: "Request not found." };
  }

  const status = callbackPayload.status;

  if (!store.transitionRequest(request.id, status)) {
    return {
      ok: false,
      reason: `Cannot apply ${status} from the request's current status.`,
    };
  }

  store.setRequestEvaluation(
    request.id,
    callbackPayload.decision_summary,
    callbackPayload.confidence_score,
  );

  const eventTime = new Date(callbackPayload.timestamp);
  store.addEvent({
    id: createId("evt"),
    refundRequestId: request.id,
    status,
    actor: "FINEBRAIN",
    message: callbackPayload.decision_summary,
    createdAt: Number.isNaN(eventTime.getTime()) ? new Date() : eventTime,
  });

  if (status === "REJECTED") {
    const transaction = usePortalStore
      .getState()
      .transactions.find((item) => item.id === request.transactionId);

    if (transaction?.status === "REFUND_REQUESTED") {
      store.setTransactionStatus(request.transactionId, "SUCCESS");
    }
  }

  const updated = usePortalStore
    .getState()
    .requests.find((item) => item.id === request.id);

  if (!updated) {
    return { ok: false, reason: "Request not found." };
  }

  return { ok: true, request: clone(updated) };
}

export async function executePayment(
  requestId: string,
): Promise<RefundRequest | null> {
  const store = usePortalStore.getState();
  const request = store.requests.find((item) => item.id === requestId);
  if (!request) return null;

  // TODO: call the real payment gateway (via the backend).

  if (!store.transitionRequest(requestId, "PROCESSING")) {
    return clone(request);
  }
  store.addEvent({
    id: createId("evt"),
    refundRequestId: requestId,
    status: "PROCESSING",
    actor: "SYSTEM",
    message: "Refund is processing.",
    createdAt: new Date(),
  });

  if (store.transitionRequest(requestId, "COMPLETED")) {
    store.addEvent({
      id: createId("evt"),
      refundRequestId: requestId,
      status: "COMPLETED",
      actor: "SYSTEM",
      message: "Refund completed.",
      createdAt: new Date(),
    });
    store.refundTransaction(request.transactionId);
  }

  const updated = usePortalStore
    .getState()
    .requests.find((item) => item.id === requestId);

  return updated ? clone(updated) : null;
}
