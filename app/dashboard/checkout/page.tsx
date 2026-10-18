"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  InfoIcon,
  Loader2Icon,
  ShoppingCartIcon,
  StoreIcon,
} from "lucide-react";

import { placeOrder } from "@/lib/api/checkout";
import { CommerceError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { useCartDetails } from "@/hooks/use-cart-details";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { currentUser, isLoading: sessionLoading } = useSession();
  const userId = currentUser?.id;
  const {
    lines,
    subtotal,
    currency,
    itemCount,
    hasIssues,
    isLoading,
    error,
    retry,
  } = useCartDetails(userId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loading = sessionLoading || isLoading;

  async function onPay() {
    if (!userId || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const order = await placeOrder(userId);
      router.push(`/dashboard/checkout/success?order=${order.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof CommerceError
          ? err.message
          : "We couldn't complete your order. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Confirm your order and complete your purchase.
        </p>
      </div>

      {loading ? (
        <CheckoutSkeleton />
      ) : error ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
          </CardContent>
        </Card>
      ) : !currentUser ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-10">
            <EmptyState
              message="Please sign in to complete your purchase."
              className="py-0"
            />
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : lines.length === 0 ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="flex flex-col items-center gap-4 px-4 py-10">
            <EmptyState
              message="Your cart is empty."
              icon={ShoppingCartIcon}
              className="py-0"
            />
            <Button asChild>
              <Link href="/dashboard/store">
                <StoreIcon />
                Browse the store
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-base font-medium">Customer</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="checkout-name">Name</Label>
                    <Input
                      id="checkout-name"
                      value={currentUser.name}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="checkout-email">Email</Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      value={currentUser.email}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Signed in as {currentUser.email}.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-base font-medium">Order items</h2>
                <ul className="flex flex-col divide-y divide-slate-800/60">
                  {lines.map((line) => {
                    const name = line.product?.name ?? "Unavailable item";
                    const unitPrice = line.product?.price ?? 0;
                    const lineCurrency = line.product?.currency ?? currency;

                    return (
                      <li
                        key={line.productId}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(unitPrice, lineCurrency)} ×{" "}
                            {line.quantity}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(line.lineTotal, lineCurrency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-base font-medium">Order summary</h2>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tracking-tight">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-xs text-[#93C5FD]">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Payment is simulated in demo mode. No card details are
                  collected.
                </span>
              </div>

              {hasIssues ? (
                <p className="text-xs text-amber-300">
                  Some items in your cart are unavailable. Review your cart
                  before paying.
                </p>
              ) : null}

              {submitError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                >
                  {submitError}
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full"
                disabled={submitting || hasIssues}
                onClick={() => void onPay()}
              >
                {submitting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <ShoppingCartIcon />
                )}
                {submitting
                  ? "Processing…"
                  : `Pay ${formatCurrency(subtotal, currency)}`}
              </Button>

              <Button type="button" variant="ghost" className="w-full" asChild>
                <Link href="/dashboard/cart">Back to cart</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
