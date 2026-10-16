"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  FileClockIcon,
  InboxIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { listTransactions } from "@/lib/api/transactions";
import { listRefundRequests } from "@/lib/api/requests";
import { listTickets } from "@/lib/api/tickets";
import { ACTIVE_REQUEST_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { useRefundModal } from "@/hooks/use-refund-modal";
import { useSession } from "@/hooks/use-session";
import type { RefundRequest, Ticket, Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TransactionStatusBadge } from "@/components/ui/transaction-status-badge";

const RECENT_LIMIT = 5;

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold">{value}</span>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg border border-slate-800/60 bg-slate-950/40 text-[#3B82F6]">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { currentUser, isLoading: sessionLoading } = useSession();
  const { openRefundModal, refundModal } = useRefundModal();

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let active = true;

    async function load() {
      setDataLoading(true);
      setError(null);

      try {
        const [txns, reqs, tks] = await Promise.all([
          listTransactions(id),
          listRefundRequests(id),
          listTickets(id),
        ]);

        if (!active) return;

        setTransactions(txns);
        setRequests(reqs);
        setTickets(tks);
      } catch {
        if (active) setError("We couldn't load your dashboard.");
      } finally {
        if (active) setDataLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId, reloadToken]);

  const loading = sessionLoading || dataLoading;

  function retry() {
    setReloadToken((token) => token + 1);
  }

  const stats = useMemo(() => {
    const totalSpent = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const activeRefunds = requests.filter((request) =>
      ACTIVE_REQUEST_STATUSES.includes(request.status),
    ).length;
    const totalRefunds = requests
      .filter((request) => request.status === "COMPLETED")
      .reduce((sum, request) => sum + request.amount, 0);
    const openTickets = tickets.filter(
      (ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS",
    ).length;

    return { totalSpent, activeRefunds, totalRefunds, openTickets };
  }, [transactions, requests, tickets]);

  const recentTransactions = transactions.slice(0, RECENT_LIMIT);
  const recentRequests = requests.slice(0, RECENT_LIMIT);

  function hasActiveRequest(transactionId: string): boolean {
    return requests.some(
      (request) =>
        request.transactionId === transactionId &&
        ACTIVE_REQUEST_STATUSES.includes(request.status),
    );
  }

  function onRequestRefund(transactionId: string) {
    const target = transactions.find(
      (transaction) => transaction.id === transactionId,
    );
    if (target) openRefundModal(target);
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            A summary of your spending, refunds and support activity.
          </p>
        </div>
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          A summary of your spending, refunds and support activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="border border-slate-800/60 bg-slate-900/40 ring-0"
            >
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="size-10 rounded-lg" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="Total Spent"
              value={formatCurrency(stats.totalSpent)}
              icon={WalletIcon}
            />
            <StatCard
              label="Active Refund Requests"
              value={stats.activeRefunds}
              icon={FileClockIcon}
            />
            <StatCard
              label="Total Refunds Issued"
              value={formatCurrency(stats.totalRefunds)}
              icon={BadgeCheckIcon}
            />
            <StatCard
              label="Open Tickets"
              value={stats.openTickets}
              icon={InboxIcon}
            />
          </>
        )}
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest charges and refunds.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <EmptyState message="No transactions yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Transaction ID</th>
                    <th className="px-4 py-2 font-medium">Service</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => {
                    const disabled =
                      transaction.status !== "SUCCESS" ||
                      hasActiveRequest(transaction.id);

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-800/40 last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                          {transaction.reference}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>{transaction.description}</span>
                            {transaction.merchant && (
                              <span className="text-xs text-muted-foreground">
                                {transaction.merchant}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatCurrency(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <TransactionStatusBadge
                            status={transaction.status}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => onRequestRefund(transaction.id)}
                          >
                            Request Refund
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Recent Refund Requests</CardTitle>
          <CardDescription>Track the status of your refunds.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <EmptyState message="No refund requests yet." />
          ) : (
            <ul className="flex flex-col">
              {recentRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/dashboard/requests/${request.id}`}
                    className="flex items-center justify-between gap-4 border-b border-slate-800/40 px-4 py-3 outline-none transition-colors last:border-0 hover:bg-slate-800/30 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-medium">
                        {request.reason}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(request.createdAt)} ·{" "}
                        {formatCurrency(request.amount, request.currency)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
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

      {refundModal}
    </div>
  );
}
