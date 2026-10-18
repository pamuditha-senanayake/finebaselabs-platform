"use client";

import Link from "next/link";
import { Loader2Icon, ShoppingCartIcon } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ProductTypeBadge,
  RefundBadge,
} from "@/components/store/product-badges";

export function ProductCard({
  product,
  onAdd,
  adding = false,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  adding?: boolean;
}) {
  const outOfStock = product.stock !== null && product.stock <= 0;

  return (
    <Card className="flex flex-col border border-slate-800/60 bg-slate-900/40 ring-0 transition-colors hover:border-slate-700/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <ProductTypeBadge type={product.type} />
          {outOfStock ? (
            <Badge
              variant="outline"
              className="border-red-500/40 bg-red-500/10 text-red-400"
            >
              Out of stock
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">
          <Link
            href={`/dashboard/store/${product.slug}`}
            className="rounded-sm outline-none transition-colors hover:text-[#3B82F6] focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {product.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {product.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto flex flex-col gap-3">
        <RefundBadge
          refundable={product.refundable}
          refundWindowDays={product.refundWindowDays}
          className="w-fit"
        />
        <span className="text-lg font-semibold tracking-tight">
          {formatCurrency(product.price, product.currency)}
        </span>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          asChild
        >
          <Link href={`/dashboard/store/${product.slug}`}>Details</Link>
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={outOfStock || adding}
          onClick={() => onAdd(product)}
        >
          {adding ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ShoppingCartIcon />
          )}
          {outOfStock ? "Out of stock" : adding ? "Adding…" : "Add to cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}
