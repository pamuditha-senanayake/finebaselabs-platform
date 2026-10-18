"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2Icon, PackageIcon, StoreIcon } from "lucide-react";

import { getOrder } from "@/lib/api/orders";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

function ConfirmationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function OrderNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Order confirmation
        </h1>
      </div>
      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardContent className="flex flex-col items-center gap-4 px-4 py-10">
          <EmptyState
            message="We couldn't find that order."
            icon={PackageIcon}
            className="py-0"
          />
          <Button asChild>
            <Link href="/dashboard/store">
              <StoreIcon />
              Back to store
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { currentUser, isLoading: sessionLoading } = useSession();
  const userId = currentUser?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userId || !orderId) {
      setIsLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const next = await getOrder(userId as string, orderId as string);

        if (!active) return;

        setOrder(next);
      } catch {
        if (active) setError("We couldn't load this order.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId, orderId, reloadToken]);

  const loading = sessionLoading || isLoading;

  if (loading) {
    return <ConfirmationSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Order confirmation
          </h1>
        </div>
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState
              message={error}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return <OrderNotFound />;
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardContent className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]">
            <CheckCircle2Icon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Order confirmed
            </h1>
            <p className="text-sm text-muted-foreground">
              Thank you{currentUser ? `, ${currentUser.name}` : ""}. Your
              purchase was completed successfully.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Order ID
              </span>
              <span className="font-mono text-xs">{order.id}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Date
              </span>
              <span className="text-sm">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Status
              </span>
              <span className="text-sm">
                {order.status === "PAID" ? "Paid" : order.status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-base font-medium">Order details</h2>
          <ul className="flex flex-col divide-y divide-slate-800/60">
            {order.items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(item.unitPrice, item.currency)} ×{" "}
                    {item.quantity}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(
                    item.unitPrice * item.quantity,
                    item.currency,
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              {formatCurrency(order.total, order.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/transactions">View my purchases</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/store">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<ConfirmationSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}
