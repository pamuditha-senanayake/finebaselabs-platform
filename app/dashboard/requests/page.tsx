"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSession } from "@/hooks/use-session";
import { useRefundRequests } from "@/hooks/use-refund-requests";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatusBadge,
  getRequestStatusLabel,
} from "@/components/ui/status-badge";

type StatusFilter = RequestStatus | "ALL";

const STATUS_FILTERS: StatusFilter[] = [
  "ALL",
  "PENDING_BRAIN_REVIEW",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "ESCALATED_HUMAN",
  "REJECTED",
  "FAILED",
];

export default function RefundRequestsPage() {
  const { currentUser, isLoading: sessionLoading } = useSession();
  const {
    requests,
    isLoading: requestsLoading,
    error,
    retry,
  } = useRefundRequests(currentUser?.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const loading = sessionLoading || requestsLoading;
  const visibleRequests =
    statusFilter === "ALL"
      ? requests
      : requests.filter((request) => request.status === statusFilter);

  function countFor(filter: StatusFilter): number {
    if (filter === "ALL") return requests.length;
    return requests.filter((request) => request.status === filter).length;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Refund Requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Every refund request you&apos;ve submitted and its current status.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter;
          const label =
            filter === "ALL" ? "All" : getRequestStatusLabel(filter);

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "border-slate-800/60 bg-slate-800/60 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-slate-800/30 hover:text-foreground",
              )}
            >
              {label}
              {!loading && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    active
                      ? "bg-slate-900/60 text-foreground"
                      : "bg-slate-800/60 text-muted-foreground",
                  )}
                >
                  {countFor(filter)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardContent className="px-0">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState message="You haven't submitted any refund requests yet." />
          ) : visibleRequests.length === 0 ? (
            <EmptyState message="No requests match this status." />
          ) : (
            <ul className="flex flex-col">
              {visibleRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/dashboard/requests/${request.id}`}
                    className="flex flex-col gap-3 border-b border-slate-800/40 px-4 py-4 outline-none transition-colors last:border-0 hover:bg-slate-800/30 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-medium">
                        {request.reason}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {request.id}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span className="text-sm font-medium">
                        {formatCurrency(request.amount, request.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </span>
                      <StatusBadge status={request.status} />
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
