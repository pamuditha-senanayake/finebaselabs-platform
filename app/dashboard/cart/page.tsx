"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  StoreIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { removeFromCart, updateQuantity } from "@/lib/api/cart";
import { CommerceError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { useCartDetails } from "@/hooks/use-cart-details";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductTypeBadge,
  RefundBadge,
} from "@/components/store/product-badges";

const MAX_QUANTITY = 10;

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={index}
            className="border border-slate-800/60 bg-slate-900/40 ring-0"
          >
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function CartPage() {
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
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loading = sessionLoading || isLoading;

  async function onUpdateQuantity(productId: string, quantity: number) {
    if (!userId) return;

    setPendingId(productId);
    try {
      await updateQuantity(userId, productId, quantity);
    } catch (err) {
      toast.error(
        err instanceof CommerceError
          ? err.message
          : "We couldn't update your cart.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function onRemove(productId: string) {
    if (!userId) return;

    setPendingId(productId);
    try {
      await removeFromCart(userId, productId);
    } catch (err) {
      toast.error(
        err instanceof CommerceError
          ? err.message
          : "We couldn't remove this item.",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground">
          Review your items before heading to checkout.
        </p>
      </div>

      {loading ? (
        <CartSkeleton />
      ) : error ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
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
          <div className="flex flex-col gap-4 lg:col-span-2">
            {lines.map((line) => {
              const product = line.product;
              const isService = product?.type === "SERVICE";
              const maxQuantity = isService
                ? 1
                : Math.min(MAX_QUANTITY, product?.stock ?? MAX_QUANTITY);
              const pending = pendingId === line.productId;

              return (
                <Card
                  key={line.productId}
                  className="border border-slate-800/60 bg-slate-900/40 ring-0"
                >
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {product ? (
                            <ProductTypeBadge type={product.type} />
                          ) : null}
                          {product ? (
                            <Link
                              href={`/dashboard/store/${product.slug}`}
                              className="rounded-sm font-medium outline-none transition-colors hover:text-[#3B82F6] focus-visible:ring-2 focus-visible:ring-ring/60"
                            >
                              {product.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-muted-foreground">
                              Unavailable item
                            </span>
                          )}
                        </div>
                        {product ? (
                          <RefundBadge
                            refundable={product.refundable}
                            refundWindowDays={product.refundWindowDays}
                            className="w-fit"
                          />
                        ) : null}
                      </div>

                      <div className="text-right">
                        <div className="font-semibold tracking-tight">
                          {formatCurrency(line.lineTotal, currency)}
                        </div>
                        {product ? (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(product.price, product.currency)}{" "}
                            each
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {line.warnings.length > 0 ? (
                      <ul className="flex flex-col gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        {line.warnings.map((warning) => (
                          <li
                            key={warning}
                            className="flex items-center gap-1.5"
                          >
                            <TriangleAlertIcon className="size-3.5 shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Decrease quantity of ${product?.name ?? "item"}`}
                          disabled={
                            pending || isService || line.quantity <= 1
                          }
                          onClick={() =>
                            void onUpdateQuantity(
                              line.productId,
                              line.quantity - 1,
                            )
                          }
                        >
                          <MinusIcon />
                        </Button>
                        <span
                          className="min-w-10 text-center text-sm font-medium"
                          aria-live="polite"
                        >
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Increase quantity of ${product?.name ?? "item"}`}
                          disabled={
                            pending ||
                            line.quantity >= maxQuantity ||
                            !line.available
                          }
                          onClick={() =>
                            void onUpdateQuantity(
                              line.productId,
                              line.quantity + 1,
                            )
                          }
                        >
                          <PlusIcon />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => void onRemove(line.productId)}
                      >
                        <Trash2Icon />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-base font-medium">Order summary</h2>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-semibold tracking-tight">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              {hasIssues ? (
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-xs text-amber-300",
                  )}
                >
                  <TriangleAlertIcon className="size-3.5 shrink-0" />
                  Resolve the highlighted items before checking out.
                </p>
              ) : null}

              {hasIssues ? (
                <Button type="button" className="w-full" disabled>
                  <ShoppingCartIcon />
                  Proceed to checkout
                </Button>
              ) : (
                <Button type="button" className="w-full" asChild>
                  <Link href="/dashboard/checkout">
                    <ShoppingCartIcon />
                    Proceed to checkout
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link href="/dashboard/store">Continue shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
