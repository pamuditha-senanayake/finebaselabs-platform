import type { RequestStatus } from "@/lib/types";

export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = [
  "PENDING_BRAIN_REVIEW",
  "APPROVED",
  "PROCESSING",
  "ESCALATED_HUMAN",
];
