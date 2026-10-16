import type { RefundRequest, TransactionStatus } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
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
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  merchant: string | null;
  created_at: string;
}

export interface RefundEvaluationRequest {
  type: "REFUND_EVALUATION_REQUEST";
  request_id: string;
  reason: string;
  requested_amount: number;
  currency: string;
  customer: FineBrainCustomer;
  transaction: FineBrainTransaction | null;
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
  const { transactions } = usePortalStore.getState();
  const transaction = transactions.find(
    (item) => item.id === payload.transactionId,
  );
  const customer = mockUsers.find((user) => user.id === payload.userId);

  const request: RefundEvaluationRequest = {
    type: "REFUND_EVALUATION_REQUEST",
    request_id: payload.id,
    reason: payload.reason,
    requested_amount: payload.amount,
    currency: payload.currency,
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email }
      : { id: payload.userId, name: "", email: "" },
    transaction: transaction
      ? {
          id: transaction.id,
          reference: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          merchant: transaction.merchant,
          created_at: transaction.createdAt.toISOString(),
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
    store.setTransactionStatus(request.transactionId, "REFUNDED");
  }

  const updated = usePortalStore
    .getState()
    .requests.find((item) => item.id === requestId);

  return updated ? clone(updated) : null;
}
