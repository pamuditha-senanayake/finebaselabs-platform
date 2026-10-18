"use client";

import { useCallback, useEffect, useState } from "react";

import { getCart } from "@/lib/api/cart";
import { getProduct } from "@/lib/api/products";
import { subscribe } from "@/lib/api/realtime";
import type { Product } from "@/lib/types";

export interface CartLine {
  productId: string;
  quantity: number;
  product: Product | null;
  warnings: string[];
  available: boolean;
  lineTotal: number;
}

export interface UseCartDetailsResult {
  lines: CartLine[];
  subtotal: number;
  currency: string;
  itemCount: number;
  hasIssues: boolean;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

function evaluateLine(
  productId: string,
  quantity: number,
  product: Product | null,
): CartLine {
  if (!product) {
    return {
      productId,
      quantity,
      product: null,
      warnings: ["This item is no longer available."],
      available: false,
      lineTotal: 0,
    };
  }

  const warnings: string[] = [];
  const isService = product.type === "SERVICE";

  if (!product.active) {
    warnings.push(`${product.name} is no longer available for purchase.`);
  }
  if (isService && quantity !== 1) {
    warnings.push(`${product.name} can only be ordered with a quantity of 1.`);
  }
  if (product.stock !== null && product.stock <= 0) {
    warnings.push(`${product.name} is out of stock.`);
  } else if (product.stock !== null && product.stock < quantity) {
    warnings.push(`Only ${product.stock} of ${product.name} left in stock.`);
  }

  const available =
    product.active &&
    (!isService || quantity === 1) &&
    (product.stock === null || product.stock >= quantity);

  return {
    productId,
    quantity,
    product,
    warnings,
    available,
    lineTotal: product.price * quantity,
  };
}

export function useCartDetails(
  userId: string | null | undefined,
): UseCartDetailsResult {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const items = userId ? await getCart(userId) : [];
        const products = await Promise.all(
          items.map((item) => getProduct(item.productId)),
        );

        if (!active) return;

        setLines(
          items.map((item, index) =>
            evaluateLine(
              item.productId,
              item.quantity,
              products[index] ?? null,
            ),
          ),
        );
        setError(null);
      } catch {
        if (active) setError("We couldn't load your cart.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    setIsLoading(true);
    void load();

    const unsubscribe = subscribe(() => {
      void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, reloadToken]);

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const currency =
    lines.find((line) => line.product)?.product?.currency ?? "USD";
  const hasIssues = lines.some((line) => !line.available);

  return {
    lines,
    subtotal,
    currency,
    itemCount,
    hasIssues,
    isLoading,
    error,
    retry,
  };
}
