import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  products as seedProducts,
  refundRequests as seedRefundRequests,
  tickets as seedTickets,
  transactions as seedTransactions,
} from "@/lib/mock-data";
import { ACTIVE_REQUEST_STATUSES, MAX_REJECTED_REFUND_ATTEMPTS } from "@/lib/constants";
import { CommerceError, RefundError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import type {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  RefundRequest,
  RequestEvent,
  RequestStatus,
  Ticket,
  Transaction,
  TransactionStatus,
} from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING_BRAIN_REVIEW: ["APPROVED", "REJECTED", "ESCALATED_HUMAN"],
  APPROVED: ["PROCESSING", "FAILED"],
  REJECTED: [],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  ESCALATED_HUMAN: ["APPROVED", "REJECTED", "PROCESSING"],
};

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

const MS_PER_DAY = 86_400_000;

export function daysSincePurchase(
  purchasedAt: Date,
  now: Date = new Date(),
): number {
  const elapsed = now.getTime() - purchasedAt.getTime();
  return Math.max(0, Math.floor(elapsed / MS_PER_DAY));
}

export interface PortalData {
  transactions: Transaction[];
  requests: RefundRequest[];
  tickets: Ticket[];
  products: Product[];
  carts: Record<string, CartItem[]>;
  orders: Order[];
}

export interface CreateRefundRequestInput {
  transactionId: string;
  userId: string;
  reason: string;
  amount?: number;
  currency?: string;
}

export interface PortalActions {
  addRequest: (request: RefundRequest) => void;
  addEvent: (event: RequestEvent) => void;
  setRequestEvaluation: (
    id: string,
    brainDecision: string,
    confidence: number,
  ) => void;
  transitionRequest: (id: string, status: RequestStatus) => boolean;
  setTransactionStatus: (id: string, status: TransactionStatus) => void;
  refundTransaction: (id: string) => void;
  createRefundRequest: (input: CreateRefundRequestInput) => RefundRequest;
  addItem: (userId: string, productId: string, quantity: number) => void;
  setCartQuantity: (
    userId: string,
    productId: string,
    quantity: number,
  ) => void;
  removeCartItem: (userId: string, productId: string) => void;
  clearUserCart: (userId: string) => void;
  createOrder: (userId: string) => Order;
  resetMockData: () => void;
}

export type PortalStore = PortalData & PortalActions;

function createSeedData(): PortalData {
  const requests = structuredClone(seedRefundRequests);

  return {
    transactions: structuredClone(seedTransactions),
    requests,
    tickets: structuredClone(seedTickets),
    products: structuredClone(seedProducts),
    carts: {},
    orders: [],
  };
}

export const usePortalStore = create<PortalStore>()(
  persist(
    (set, get) => ({
      ...createSeedData(),

      addRequest: (request) =>
        set((state) => ({ requests: [...state.requests, request] })),

      addEvent: (event) =>
        set((state) => ({
          requests: state.requests.map((request) =>
            request.id === event.refundRequestId
              ? { ...request, events: [...request.events, event] }
              : request,
          ),
        })),

      setRequestEvaluation: (id, brainDecision, confidence) =>
        set((state) => ({
          requests: state.requests.map((request) =>
            request.id === id
              ? { ...request, brainDecision, confidence, updatedAt: new Date() }
              : request,
          ),
        })),

      transitionRequest: (id, status) => {
        const request = get().requests.find((item) => item.id === id);
        if (!request) return false;
        if (request.status === status) return true;
        if (!canTransition(request.status, status)) return false;

        set((state) => ({
          requests: state.requests.map((item) =>
            item.id === id ? { ...item, status, updatedAt: new Date() } : item,
          ),
        }));

        return true;
      },

      setTransactionStatus: (id, status) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id
              ? { ...transaction, status, updatedAt: new Date() }
              : transaction,
          ),
        })),

      refundTransaction: (id) =>
        set((state) => {
          const transaction = state.transactions.find((item) => item.id === id);
          if (!transaction) return {};

          const order = transaction.orderId
            ? state.orders.find((item) => item.id === transaction.orderId)
            : undefined;
          const restockQuantity = transaction.productId
            ? (order?.items.find(
                (item) => item.productId === transaction.productId,
              )?.quantity ?? 1)
            : 0;

          const transactions = state.transactions.map((item) =>
            item.id === id
              ? { ...item, status: "REFUNDED" as TransactionStatus, updatedAt: new Date() }
              : item,
          );

          const products =
            transaction.productId && restockQuantity > 0
              ? state.products.map((product) =>
                  product.id === transaction.productId &&
                  product.stock !== null
                    ? { ...product, stock: product.stock + restockQuantity }
                    : product,
                )
              : state.products;

          const orders = transaction.orderId
            ? state.orders.map((item) => {
                if (item.id !== transaction.orderId) return item;

                const orderTransactions = transactions.filter(
                  (candidate) => candidate.orderId === item.id,
                );
                const anyRefunded = orderTransactions.some(
                  (candidate) => candidate.status === "REFUNDED",
                );
                const allRefunded =
                  orderTransactions.length > 0 &&
                  orderTransactions.every(
                    (candidate) => candidate.status === "REFUNDED",
                  );

                if (!anyRefunded) return item;

                const nextStatus: OrderStatus = allRefunded
                  ? "REFUNDED"
                  : "PARTIALLY_REFUNDED";

                return nextStatus === item.status
                  ? item
                  : { ...item, status: nextStatus };
              })
            : state.orders;

          return { transactions, products, orders };
        }),

      createRefundRequest: (input) => {
        const state = get();
        const transaction = state.transactions.find(
          (item) => item.id === input.transactionId,
        );

        if (!transaction) {
          throw new RefundError("TRANSACTION_NOT_FOUND", "Transaction not found.");
        }
        if (transaction.userId !== input.userId) {
          throw new RefundError(
            "TRANSACTION_NOT_OWNED",
            "This transaction doesn't belong to your account.",
          );
        }
        if (transaction.status !== "SUCCESS") {
          throw new RefundError(
            "TRANSACTION_NOT_REFUNDABLE",
            "This transaction is no longer eligible for a refund.",
          );
        }

        const hasActiveRequest = state.requests.some(
          (request) =>
            request.transactionId === input.transactionId &&
            ACTIVE_REQUEST_STATUSES.includes(request.status),
        );
        if (hasActiveRequest) {
          throw new RefundError(
            "DUPLICATE_ACTIVE_REQUEST",
            "An active refund request already exists for this transaction.",
          );
        }

        const rejectedCount = state.requests.filter(
          (request) =>
            request.transactionId === input.transactionId &&
            request.status === "REJECTED",
        ).length;
        if (rejectedCount >= MAX_REJECTED_REFUND_ATTEMPTS) {
          throw new RefundError(
            "REFUND_LIMIT_REACHED",
            "Refund limit reached, contact support",
          );
        }

        const amount = input.amount ?? transaction.amount;
        if (amount <= 0) {
          throw new RefundError(
            "INVALID_AMOUNT",
            "The refund amount must be greater than zero.",
          );
        }
        if (amount > transaction.amount) {
          throw new RefundError(
            "AMOUNT_EXCEEDS_TRANSACTION",
            "The refund amount can't exceed the transaction amount.",
          );
        }

        if (transaction.productId) {
          const product = state.products.find(
            (item) => item.id === transaction.productId,
          );

          if (product) {
            if (!product.refundable) {
              throw new RefundError(
                "PRODUCT_NOT_REFUNDABLE",
                "Not refundable",
              );
            }

            const elapsedDays = daysSincePurchase(transaction.createdAt);
            if (elapsedDays > product.refundWindowDays) {
              throw new RefundError(
                "REFUND_WINDOW_EXPIRED",
                `Refund window of ${product.refundWindowDays} days has passed`,
              );
            }
          }
        }

        const now = new Date();
        const id = createId("rfr");
        const receivedEvent: RequestEvent = {
          id: createId("evt"),
          refundRequestId: id,
          status: "PENDING_BRAIN_REVIEW",
          actor: "CUSTOMER",
          message: "Request received",
          createdAt: now,
        };
        const request: RefundRequest = {
          id,
          transactionId: input.transactionId,
          userId: input.userId,
          status: "PENDING_BRAIN_REVIEW",
          reason: input.reason,
          brainDecision: null,
          confidence: null,
          amount,
          currency: input.currency ?? transaction.currency,
          createdAt: now,
          updatedAt: now,
          events: [receivedEvent],
        };

        set((prev) => ({
          requests: [...prev.requests, request],
          transactions: prev.transactions.map((item) =>
            item.id === input.transactionId
              ? { ...item, status: "REFUND_REQUESTED", updatedAt: now }
              : item,
          ),
        }));

        return request;
      },

      addItem: (userId, productId, quantity) =>
        set((state) => {
          const cart = state.carts[userId] ?? [];
          const existing = cart.find((item) => item.productId === productId);
          const nextCart = existing
            ? cart.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              )
            : [...cart, { productId, quantity }];

          return { carts: { ...state.carts, [userId]: nextCart } };
        }),

      setCartQuantity: (userId, productId, quantity) =>
        set((state) => {
          const cart = state.carts[userId] ?? [];
          const nextCart = cart.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          );

          return { carts: { ...state.carts, [userId]: nextCart } };
        }),

      removeCartItem: (userId, productId) =>
        set((state) => {
          const cart = state.carts[userId] ?? [];

          return {
            carts: {
              ...state.carts,
              [userId]: cart.filter((item) => item.productId !== productId),
            },
          };
        }),

      clearUserCart: (userId) =>
        set((state) => ({ carts: { ...state.carts, [userId]: [] } })),

      createOrder: (userId) => {
        const state = get();
        const cart = state.carts[userId] ?? [];

        if (cart.length === 0) {
          throw new CommerceError("EMPTY_CART", "Your cart is empty.");
        }

        const items: OrderItem[] = [];

        for (const line of cart) {
          const product = state.products.find(
            (item) => item.id === line.productId,
          );

          if (!product) {
            throw new CommerceError(
              "PRODUCT_NOT_FOUND",
              "One of the products in your cart is no longer available.",
            );
          }
          if (!product.active) {
            throw new CommerceError(
              "PRODUCT_INACTIVE",
              `${product.name} is no longer available for purchase.`,
            );
          }

          const isService = product.type === "SERVICE";
          const quantityIsValid =
            Number.isInteger(line.quantity) &&
            line.quantity >= 1 &&
            line.quantity <= 10 &&
            (!isService || line.quantity === 1);

          if (!quantityIsValid) {
            throw new CommerceError(
              "INVALID_QUANTITY",
              isService
                ? `${product.name} can only be ordered with a quantity of 1.`
                : `Quantity for ${product.name} must be between 1 and 10.`,
            );
          }

          if (product.stock !== null && product.stock < line.quantity) {
            throw new CommerceError(
              "OUT_OF_STOCK",
              product.stock === 0
                ? `${product.name} is out of stock.`
                : `Only ${product.stock} of ${product.name} left in stock.`,
            );
          }

          items.push({
            productId: product.id,
            name: product.name,
            quantity: line.quantity,
            unitPrice: product.price,
            currency: product.currency,
          });
        }

        const currency = items[0].currency;
        if (items.some((item) => item.currency !== currency)) {
          throw new CommerceError(
            "CURRENCY_MISMATCH",
            "All items in an order must use the same currency.",
          );
        }

        const total = items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );

        const now = new Date();
        const order: Order = {
          id: createId("ord"),
          userId,
          items,
          total,
          currency,
          status: "PAID",
          createdAt: now,
        };

        const newTransactions: Transaction[] = items.map((item) => {
          const id = createId("txn");

          return {
            id,
            userId,
            amount: item.unitPrice * item.quantity,
            currency: item.currency,
            status: "SUCCESS",
            description:
              item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
            merchant: "FineBase Store",
            reference: `TXN-${id.slice("txn_".length).toUpperCase()}`,
            productId: item.productId,
            orderId: order.id,
            createdAt: now,
            updatedAt: now,
          };
        });

        set((prev) => ({
          orders: [...prev.orders, order],
          transactions: [...prev.transactions, ...newTransactions],
          products: prev.products.map((product) => {
            const item = items.find(
              (line) => line.productId === product.id,
            );

            if (!item || product.stock === null) return product;

            return { ...product, stock: product.stock - item.quantity };
          }),
          carts: { ...prev.carts, [userId]: [] },
        }));

        return order;
      },

      resetMockData: () => set(() => ({ ...createSeedData() })),
    }),
    {
      name: "finebase-portal",
      version: 2,
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key, value) =>
          typeof value === "string" && ISO_DATE.test(value)
            ? new Date(value)
            : value,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<PortalData>;
        const seed = createSeedData();

        // v1 -> v2: old persisted data may contain event actors from removed
        // non-customer roles; coerce anything unknown to SYSTEM so loading
        // never crashes or surfaces stale actors.
        const sanitizeRequests = (requests: RefundRequest[]): RefundRequest[] =>
          requests.map((request) => ({
            ...request,
            events: (request.events ?? []).map((event) =>
              event.actor === "SYSTEM" ||
              event.actor === "FINEBRAIN" ||
              event.actor === "CUSTOMER"
                ? event
                : { ...event, actor: "SYSTEM" as const },
            ),
          }));

        return {
          transactions: state.transactions ?? seed.transactions,
          requests: sanitizeRequests(state.requests ?? seed.requests),
          tickets: state.tickets ?? seed.tickets,
          products:
            state.products && state.products.length > 0
              ? state.products
              : seed.products,
          carts: state.carts ?? {},
          orders: state.orders ?? [],
        };
      },
      partialize: (state) => ({
        transactions: state.transactions,
        requests: state.requests,
        tickets: state.tickets,
        products: state.products,
        carts: state.carts,
        orders: state.orders,
      }),
    },
  ),
);
