"use client";

import { useCallback, useEffect, useState } from "react";

import { listRefundRequests } from "@/lib/api/requests";
import { subscribe } from "@/lib/api/realtime";
import type { RefundRequest } from "@/lib/types";

export interface UseRefundRequestsResult {
  requests: RefundRequest[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useRefundRequests(
  userId: string | null | undefined,
): UseRefundRequestsResult {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = userId ? await listRefundRequests(userId) : [];

        if (!active) return;

        setRequests(next);
        setError(null);
      } catch {
        if (active) setError("We couldn't load your refund requests.");
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

  return { requests, isLoading, error, retry };
}
