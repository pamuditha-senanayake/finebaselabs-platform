"use client";

import { useEffect, useState } from "react";

import { getSession } from "@/lib/api/auth";
import type { Role, User } from "@/lib/types";

export interface UseSessionResult {
  currentUser: User | null;
  role: Role | null;
  isLoading: boolean;
}

export function useSession(): UseSessionResult {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getSession()
      .then((user) => {
        if (active) setCurrentUser(user);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    currentUser,
    role: currentUser?.role ?? null,
    isLoading,
  };
}
