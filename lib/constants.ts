import type { RequestStatus } from "@/lib/types";

export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "PENDING_BRAIN_REVIEW",
  "APPROVED",
  "PROCESSING",
  "ESCALATED_HUMAN",
];

export const MAX_REJECTED_REFUND_ATTEMPTS = 2;
