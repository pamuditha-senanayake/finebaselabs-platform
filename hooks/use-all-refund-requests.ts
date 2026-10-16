"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listAllRefundRequests,
  listEscalatedRequests,
} from "@/lib/api/requests";
import { subscribe } from "@/lib/api/realtime";
import type { RefundRequest } from "@/lib/types";

export interface UseAllRefundRequestsResult {
  requests: RefundRequest[];
  escalated: RefundRequest[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAllRefundRequests(): UseAllRefundRequestsResult {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [escalated, setEscalated] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [all, escalatedRequests] = await Promise.all([
          listAllRefundRequests(),
          listEscalatedRequests(),
        ]);

        if (!active) return;

        setRequests(all);
        setEscalated(escalatedRequests);
        setError(null);
      } catch {
        if (active) setError("We couldn't load the refund requests.");
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
  }, [reloadToken]);

  return { requests, escalated, isLoading, error, retry };
}
