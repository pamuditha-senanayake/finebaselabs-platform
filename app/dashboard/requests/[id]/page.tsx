"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  ClockIcon,
  Loader2Icon,
  OctagonXIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useSession } from "@/hooks/use-session";
import { useRefundRequest } from "@/hooks/use-refund-request";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TransactionStatusBadge } from "@/components/ui/transaction-status-badge";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

type PaymentState = "pending" | "processing" | "completed" | "failed";

const PAYMENT_STATE: Record<
  PaymentState,
  { label: string; description: string; icon: LucideIcon; className: string }
> = {
  pending: {
    label: "Pending",
    description: "The payment will run once the refund is approved.",
    icon: ClockIcon,
    className: "border-slate-800/60 bg-slate-950/40 text-slate-400",
  },
  processing: {
    label: "Processing",
    description: "The refund payment is currently being processed.",
    icon: Loader2Icon,
    className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]",
  },
  completed: {
    label: "Completed",
    description: "The refund has been paid to the original method.",
    icon: CircleCheckIcon,
    className: "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]",
  },
  failed: {
    label: "Failed",
    description: "The refund payment could not be completed.",
    icon: OctagonXIcon,
    className: "border-red-500/40 bg-red-500/10 text-red-400",
  },
};

function getPaymentState(status: RequestStatus): PaymentState {
  switch (status) {
    case "PROCESSING":
      return "processing";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function RefundRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { currentUser, isLoading: sessionLoading } = useSession();
  const {
    request,
    transaction,
    isLoading: requestLoading,
    error,
    retry,
  } = useRefundRequest(params.id);

  if (sessionLoading || requestLoading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/requests"
            className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowLeftIcon className="size-4" />
            Back to requests
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Refund request
          </h1>
        </div>

        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request || !currentUser || request.userId !== currentUser.id) {
    notFound();
  }

  const hasDecision = request.brainDecision !== null;
  const waitingForEvaluation =
    request.status === "PENDING_BRAIN_REVIEW" && !hasDecision;
  const payment = PAYMENT_STATE[getPaymentState(request.status)];
  const PaymentIcon = payment.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/requests"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ArrowLeftIcon className="size-4" />
          Back to requests
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Refund request
        </h1>
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Request summary</CardTitle>
          <CardDescription>Details of your refund request.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Request ID"
              value={<span className="font-mono text-xs">{request.id}</span>}
            />
            <Field label="Status" value={<StatusBadge status={request.status} />} />
            <Field
              label="Amount"
              value={formatCurrency(request.amount, request.currency)}
            />
            <Field label="Submitted" value={formatDate(request.createdAt)} />
          </div>

          <Field label="Reason" value={request.reason} />
          <Field label="Description" value={transaction?.description ?? "—"} />

          <div className="flex flex-col gap-4 rounded-lg border border-slate-800/60 p-4">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Transaction details
            </span>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Transaction ID"
                value={
                  <span className="font-mono text-xs">
                    {transaction?.reference ?? "—"}
                  </span>
                }
              />
              <Field label="Merchant" value={transaction?.merchant ?? "—"} />
              <Field
                label="Charged"
                value={transaction ? formatDate(transaction.createdAt) : "—"}
              />
              <Field
                label="Transaction status"
                value={
                  transaction ? (
                    <TransactionStatusBadge status={transaction.status} />
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
            <CardDescription>
              The full audit trail for this request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline events={request.events} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardHeader>
              <CardTitle>FineBrain evaluation</CardTitle>
              <CardDescription>Automated review by FineBrain.</CardDescription>
            </CardHeader>
            <CardContent>
              {hasDecision ? (
                <div className="flex flex-col gap-4">
                  {request.confidence !== null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Confidence
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round(request.confidence * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/60">
                        <div
                          className="h-full rounded-full bg-[#3B82F6]"
                          style={{
                            width: `${Math.round(request.confidence * 100)}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                  {request.brainDecision && (
                    <p className="text-sm text-muted-foreground">
                      {request.brainDecision}
                    </p>
                  )}
                </div>
              ) : waitingForEvaluation ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin text-[#3B82F6]" />
                  Waiting for FineBrain evaluation
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No evaluation recorded.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardHeader>
              <CardTitle>Payment execution</CardTitle>
              <CardDescription>Payout status for this refund.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    payment.className,
                  )}
                >
                  <PaymentIcon className="size-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{payment.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {payment.description}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
