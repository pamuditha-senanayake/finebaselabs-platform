"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  FileClockIcon,
  LogOutIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

import { logout } from "@/lib/api/auth";
import { listProducts } from "@/lib/api/products";
import { listTransactions } from "@/lib/api/transactions";
import { listRefundRequests } from "@/lib/api/requests";
import { subscribe } from "@/lib/api/realtime";
import { ACTIVE_REQUEST_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import type { Product, RefundRequest, Transaction } from "@/lib/types";
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
import { ProductTypeBadge } from "@/components/store/product-badges";

const RECENT_LIMIT = 5;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

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

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const { currentUser, isLoading: sessionLoading } = useSession();

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let active = true;

    async function load(showLoading = true) {
      if (showLoading) setDataLoading(true);
      setError(null);

      try {
        const [txns, reqs, prods] = await Promise.all([
          listTransactions(id),
          listRefundRequests(id),
          listProducts({ includeInactive: true }),
        ]);

        if (!active) return;

        setTransactions(txns);
        setRequests(reqs);
        setProducts(prods);
      } catch {
        if (active) setError("We couldn't load your account.");
      } finally {
        if (active && showLoading) setDataLoading(false);
      }
    }

    void load();

    const unsubscribe = subscribe(() => {
      void load(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, reloadToken]);

  const loading = sessionLoading || dataLoading;

  function retry() {
    setReloadToken((token) => token + 1);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  }

  const stats = useMemo(() => {
    const totalSpent = transactions
      .filter((transaction) => transaction.status === "SUCCESS")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const activeRefunds = requests.filter((request) =>
      ACTIVE_REQUEST_STATUSES.includes(request.status),
    ).length;
    const totalRefunded = requests
      .filter((request) => request.status === "COMPLETED")
      .reduce((sum, request) => sum + request.amount, 0);

    return { totalSpent, activeRefunds, totalRefunded };
  }, [transactions, requests]);

  const recentPurchases = transactions
    .filter((transaction) => transaction.productId)
    .slice(0, RECENT_LIMIT);
  const recentRequests = requests.slice(0, RECENT_LIMIT);

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground">
            Your profile, purchases and refund activity.
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
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Your profile, purchases and refund activity.
        </p>
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your details on this portal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading || !currentUser ? (
            <ProfileSkeleton />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-800/60 bg-slate-950/40 text-base font-semibold text-[#3B82F6]">
                  {initialsOf(currentUser.name)}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-base font-semibold">
                    {currentUser.name}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {currentUser.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Customer since {formatDate(currentUser.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800/60 pt-4 text-sm text-muted-foreground">
            <p>Your profile is read-only here.</p>
            {/* TODO: point at the real account-management URL once it exists. */}
            <a
              href="https://finebaselabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Manage your password and sign-in on finebaselabs.com
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
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
              label="Total Refunded"
              value={formatCurrency(stats.totalRefunded)}
              icon={BadgeCheckIcon}
            />
          </>
        )}
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Recent purchases</CardTitle>
            <Link
              href="/dashboard/transactions"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-[#3B82F6] outline-none transition-colors hover:text-[#3B82F6]/80 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              View all
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <CardDescription>
            Your latest store purchases, with full history on the Purchases
            page.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : recentPurchases.length === 0 ? (
            <EmptyState message="No purchases yet." />
          ) : (
            <ul className="flex flex-col">
              {recentPurchases.map((transaction) => {
                const product = transaction.productId
                  ? productMap.get(transaction.productId)
                  : undefined;

                return (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-800/40 px-4 py-3 last:border-0"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {product ? (
                          <ProductTypeBadge type={product.type} />
                        ) : null}
                        {product ? (
                          <Link
                            href={`/dashboard/store/${product.slug}`}
                            className="truncate text-sm font-medium outline-none transition-colors hover:text-[#3B82F6] focus-visible:ring-2 focus-visible:ring-ring/60"
                          >
                            {product.name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-medium">
                            {transaction.description}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </span>
                      <TransactionStatusBadge status={transaction.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Recent refund requests</CardTitle>
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

      <div className="flex justify-end border-t border-slate-800/60 pt-6">
        <Button
          type="button"
          variant="outline"
          disabled={signingOut || sessionLoading}
          onClick={handleSignOut}
        >
          <LogOutIcon />
          Sign out
        </Button>
      </div>
    </div>
  );
}
