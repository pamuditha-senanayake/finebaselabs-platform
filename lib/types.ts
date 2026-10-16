export type Role = "CUSTOMER" | "ADMIN" | "SUPPORT_AGENT";

export type RequestStatus =
  | "PENDING_BRAIN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "ESCALATED_HUMAN";

export type TransactionStatus = "SUCCESS" | "REFUND_REQUESTED" | "REFUNDED";

export type EventActor =
  | "SYSTEM"
  | "FINEBRAIN"
  | "CUSTOMER"
  | "SUPPORT_AGENT"
  | "ADMIN";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  merchant: string | null;
  reference: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestEvent {
  id: string;
  refundRequestId: string;
  status: RequestStatus;
  actor: EventActor;
  message: string;
  createdAt: Date;
}

export interface RefundRequest {
  id: string;
  transactionId: string;
  userId: string;
  status: RequestStatus;
  reason: string;
  brainDecision: string | null;
  confidence: number | null;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  events: RequestEvent[];
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
}
