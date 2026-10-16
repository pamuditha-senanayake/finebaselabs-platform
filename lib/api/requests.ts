import type { RefundRequest, RequestStatus } from "@/lib/types";
import {
  usePortalStore,
  type CreateRefundRequestInput,
} from "@/lib/store";
import { executePayment, sendToFineBrain } from "@/lib/api/finebrain";
import { clone, createId, delay } from "@/lib/api/_shared";

export type SubmitRefundInput = CreateRefundRequestInput;

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

export async function listAllRefundRequests(): Promise<RefundRequest[]> {
  await delay();

  const { requests } = usePortalStore.getState();

  return clone(requests).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function listEscalatedRequests(): Promise<RefundRequest[]> {
  await delay();

  const { requests } = usePortalStore.getState();
  const source = requests.filter(
    (request) => request.status === "ESCALATED_HUMAN",
  );

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

export type AdminDecision = "APPROVED" | "REJECTED";

export async function adminDecision(
  requestId: string,
  decision: AdminDecision,
  reason: string,
): Promise<RefundRequest | null> {
  await delay();

  const store = usePortalStore.getState();
  const request = store.requests.find((item) => item.id === requestId);
  if (!request) return null;

  const targetStatus: RequestStatus =
    decision === "APPROVED" ? "APPROVED" : "REJECTED";

  if (!store.transitionRequest(requestId, targetStatus)) {
    return null;
  }

  const trimmedReason = reason.trim();
  const label = decision === "APPROVED" ? "Approved" : "Rejected";
  const message = trimmedReason
    ? `${label} by admin: ${trimmedReason}`
    : `${label} by admin.`;

  store.addEvent({
    id: createId("evt"),
    refundRequestId: requestId,
    status: targetStatus,
    actor: "ADMIN",
    message,
    createdAt: new Date(),
  });

  if (decision === "APPROVED") {
    await executePayment(requestId);
  }

  const updated = usePortalStore
    .getState()
    .requests.find((item) => item.id === requestId);

  return updated ? clone(updated) : null;
}
