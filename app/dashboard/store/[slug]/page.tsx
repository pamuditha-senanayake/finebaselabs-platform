"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Loader2Icon,
  MinusIcon,
  PackageCheckIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "lucide-react";

import { getProductBySlug } from "@/lib/api/products";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useSession } from "@/hooks/use-session";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProductTypeBadge,
  RefundBadge,
  getRefundPolicyLabel,
} from "@/components/store/product-badges";

const MAX_QUANTITY = 10;

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-28" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
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

function ProductView({ product }: { product: Product }) {
  const router = useRouter();
  const { add, pendingId } = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  const isService = product.type === "SERVICE";
  const outOfStock = product.stock !== null && product.stock <= 0;
  const maxQuantity = isService
    ? 1
    : Math.min(MAX_QUANTITY, product.stock ?? MAX_QUANTITY);
  const adding = pendingId === product.id;

  function changeQuantity(next: number) {
    setQuantity(Math.min(Math.max(1, next), Math.max(1, maxQuantity)));
  }

  async function onBuyNow() {
    const ok = await add(product, quantity);
    if (ok) router.push("/dashboard/checkout");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/store"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ArrowLeftIcon className="size-4" />
          Back to store
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <ProductTypeBadge type={product.type} />
          <Badge variant="outline" className="text-muted-foreground">
            {product.category}
          </Badge>
          {outOfStock ? (
            <Badge
              variant="outline"
              className="border-red-500/40 bg-red-500/10 text-red-400"
            >
              Out of stock
            </Badge>
          ) : null}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>
                What&apos;s included with this item.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Product ID"
                  value={<span className="font-mono text-xs">{product.id}</span>}
                />
                <Field
                  label="Slug"
                  value={
                    <span className="font-mono text-xs">{product.slug}</span>
                  }
                />
                <Field
                  label="Type"
                  value={<ProductTypeBadge type={product.type} />}
                />
                <Field label="Category" value={product.category} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardHeader>
              <CardTitle>Refund policy</CardTitle>
              <CardDescription>
                How this purchase is protected by our refund policy.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RefundBadge
                refundable={product.refundable}
                refundWindowDays={product.refundWindowDays}
                className="w-fit"
              />
              <p className="text-sm text-muted-foreground">
                {product.refundable
                  ? `You can request a refund within ${product.refundWindowDays} days of purchase. Refund requests are evaluated automatically by FineBrain and, when needed, reviewed by a support agent.`
                  : "This item is not eligible for a refund after purchase."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Price
                </span>
                <span className="text-2xl font-semibold tracking-tight">
                  {formatCurrency(product.price, product.currency)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PackageCheckIcon className="size-4" />
                {isService
                  ? "Delivered to your account"
                  : outOfStock
                    ? "Currently unavailable"
                    : `${product.stock} in stock`}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Quantity
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Decrease quantity"
                    disabled={isService || outOfStock || quantity <= 1}
                    onClick={() => changeQuantity(quantity - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  <span
                    className="min-w-10 text-center text-sm font-medium"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Increase quantity"
                    disabled={isService || outOfStock || quantity >= maxQuantity}
                    onClick={() => changeQuantity(quantity + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                {isService ? (
                  <span className="text-xs text-muted-foreground">
                    Services are limited to a quantity of 1.
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={outOfStock || adding}
                  onClick={() => void add(product, quantity)}
                >
                  {adding ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <ShoppingCartIcon />
                  )}
                  {outOfStock ? "Out of stock" : "Add to cart"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={outOfStock || adding}
                  onClick={() => void onBuyNow()}
                >
                  Buy now
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {getRefundPolicyLabel(
                  product.refundable,
                  product.refundWindowDays,
                )}
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const { isLoading: sessionLoading } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const next = await getProductBySlug(params.slug);

        if (!active) return;

        setProduct(next && next.active ? next : null);
      } catch {
        if (active) setError("We couldn't load this product right now.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [params.slug, reloadToken]);

  function retry() {
    setReloadToken((token) => token + 1);
  }

  const loading = sessionLoading || isLoading;

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/store"
            className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowLeftIcon className="size-4" />
            Back to store
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Product</h1>
        </div>
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return <ProductView product={product} />;
}
