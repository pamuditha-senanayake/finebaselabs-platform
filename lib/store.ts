import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  refundRequests as seedRefundRequests,
  tickets as seedTickets,
  transactions as seedTransactions,
} from "@/lib/mock-data";
import { ACTIVE_REQUEST_STATUSES } from "@/lib/constants";
import { RefundError } from "@/lib/errors";
import { createId } from "@/lib/ids";
import type {
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

export interface PortalData {
  transactions: Transaction[];
  requests: RefundRequest[];
  tickets: Ticket[];
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
  createRefundRequest: (input: CreateRefundRequestInput) => RefundRequest;
  resetMockData: () => void;
}

export type PortalStore = PortalData & PortalActions;

function createSeedData(): PortalData {
  const requests = structuredClone(seedRefundRequests);

  return {
    transactions: structuredClone(seedTransactions),
    requests,
    tickets: structuredClone(seedTickets),
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

      resetMockData: () => set(() => ({ ...createSeedData() })),
    }),
    {
      name: "finebase-portal",
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key, value) =>
          typeof value === "string" && ISO_DATE.test(value)
            ? new Date(value)
            : value,
      }),
      partialize: (state) => ({
        transactions: state.transactions,
        requests: state.requests,
        tickets: state.tickets,
      }),
    },
  ),
);
