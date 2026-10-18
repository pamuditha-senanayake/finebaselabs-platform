"use client";

import { useCallback, useEffect, useState } from "react";

import { getRefundRequest } from "@/lib/api/requests";
import { getProduct } from "@/lib/api/products";
import { subscribe } from "@/lib/api/realtime";
import { getTransaction } from "@/lib/api/transactions";
import type { Product, RefundRequest, Transaction } from "@/lib/types";

export interface UseRefundRequestResult {
  request: RefundRequest | null;
  transaction: Transaction | null;
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useRefundRequest(id: string): UseRefundRequestResult {
  const [result, setResult] = useState<
    | {
        request: RefundRequest | null;
        transaction: Transaction | null;
        product: Product | null;
      }
    | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const request = await getRefundRequest(id);
        const transaction = request
          ? await getTransaction(request.transactionId)
          : null;
        const product = transaction?.productId
          ? await getProduct(transaction.productId)
          : null;

        if (!active) return;

        setResult({ request, transaction, product });
        setError(null);
      } catch {
        if (active) setError("We couldn't load this refund request.");
      }
    };

    setResult(undefined);
    void load();

    const unsubscribe = subscribe(() => {
      void load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id, reloadToken]);

  return {
    request: result?.request ?? null,
    transaction: result?.transaction ?? null,
    product: result?.product ?? null,
    isLoading: result === undefined && error === null,
    error,
    retry,
  };
}
