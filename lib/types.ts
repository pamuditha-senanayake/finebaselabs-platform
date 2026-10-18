export type Role = "CUSTOMER";

export type RequestStatus =
  | "PENDING_BRAIN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "ESCALATED_HUMAN";

export type TransactionStatus = "SUCCESS" | "REFUND_REQUESTED" | "REFUNDED";

export type EventActor = "SYSTEM" | "FINEBRAIN" | "CUSTOMER";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProductType = "SERVICE" | "PRODUCT";

export type OrderStatus = "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED";

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
  productId?: string;
  orderId?: string;
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

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ProductType;
  category: string;
  price: number; // minor units (cents)
  currency: string;
  refundable: boolean;
  refundWindowDays: number;
  stock: number | null; // null for services
  active: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // minor units (cents)
  currency: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number; // minor units (cents)
  currency: string;
  status: OrderStatus;
  createdAt: Date;
}
