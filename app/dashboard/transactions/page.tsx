"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, SearchIcon, SearchXIcon } from "lucide-react";

import { listRefundRequests } from "@/lib/api/requests";
import { listTransactions } from "@/lib/api/transactions";
import { ACTIVE_REQUEST_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { useRefundModal } from "@/hooks/use-refund-modal";
import { useSession } from "@/hooks/use-session";
import type {
  RefundRequest,
  Transaction,
  TransactionStatus,
} from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionStatusBadge } from "@/components/ui/transaction-status-badge";

type StatusFilter = TransactionStatus | "ALL";
type SortDirection = "desc" | "asc";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "SUCCESS", label: "Success" },
  { value: "REFUND_REQUESTED", label: "Refund Requested" },
  { value: "REFUNDED", label: "Refunded" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
        const [txns, reqs] = await Promise.all([
          listTransactions(id),
          listRefundRequests(id),
        ]);

        if (!active) return;

        setTransactions(txns);
        setRequests(reqs);
      } catch {
        if (active) setError("We couldn't load your transactions.");
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

  const visibleTransactions = useMemo(() => {
    const term = query.trim().toLowerCase();

    const rows = transactions.filter((transaction) => {
      if (statusFilter !== "ALL" && transaction.status !== statusFilter) {
        return false;
      }

      if (!term) return true;

      const searchable = [
        transaction.id,
        transaction.reference,
        transaction.description,
        transaction.merchant ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });

    return rows.sort((a, b) =>
      sortDirection === "desc"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }, [transactions, query, statusFilter, sortDirection]);

  const activeStatusFilter =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? "";

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

  function toggleSortDirection() {
    setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Search, filter and sort your full transaction history.
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
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Search, filter and sort your full transaction history.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ID or service"
            aria-label="Search transactions by ID or service"
            className="pl-8"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger
            className="w-full sm:w-48"
            aria-label="Filter by status"
          >
            <SelectValue>{activeStatusFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="sm:w-auto"
          onClick={toggleSortDirection}
          aria-label={
            sortDirection === "desc"
              ? "Sort by date, oldest first"
              : "Sort by date, newest first"
          }
        >
          {sortDirection === "desc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
          {sortDirection === "desc" ? "Newest first" : "Oldest first"}
        </Button>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {visibleTransactions.length} of {transactions.length}{" "}
          transactions
        </p>
      )}

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Every charge issued to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState message="No transactions yet." />
          ) : visibleTransactions.length === 0 ? (
            <EmptyState
              message="No transactions match your search or filters."
              icon={SearchXIcon}
            />
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
                  {visibleTransactions.map((transaction) => {
                    const disabled =
                      transaction.status !== "SUCCESS" ||
                      hasActiveRequest(transaction.id);

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-800/40 last:border-0"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">
                              {transaction.reference}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {transaction.id}
                            </span>
                          </div>
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
                        <td className="px-4 py-3 whitespace-nowrap">
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

      {refundModal}
    </div>
  );
}
