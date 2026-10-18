import type { User } from "@/lib/types";
import { DEMO_PASSWORD } from "@/lib/mock-data";

const AUTH_ENDPOINT = "/api/mock-auth";

export const demoAccounts = {
  CUSTOMER: { email: "client@finebase.com", password: DEMO_PASSWORD },
} as const;

export type DemoRole = keyof typeof demoAccounts;

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(AUTH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json().catch(() => null)) as
    | { user?: User; error?: string }
    | null;

  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? "Invalid email or password.");
  }

  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(AUTH_ENDPOINT, { method: "DELETE" });
}

export async function getSession(): Promise<User | null> {
  const response = await fetch(AUTH_ENDPOINT, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as
    | { user: User | null }
    | null;

  return data?.user ?? null;
}
