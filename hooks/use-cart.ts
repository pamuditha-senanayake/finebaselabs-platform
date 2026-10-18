"use client";

import { useCallback, useEffect, useState } from "react";

import { getCart } from "@/lib/api/cart";
import { subscribe } from "@/lib/api/realtime";
import type { CartItem } from "@/lib/types";

export interface UseCartResult {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useCart(userId: string | null | undefined): UseCartResult {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = userId ? await getCart(userId) : [];

        if (!active) return;

        setItems(next);
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

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, itemCount, isLoading, error, retry };
}
