import type { Role, User } from "@/lib/types";

// NOTE: mock only. The session cookie is an unsigned, URL-encoded JSON payload
// that a client could forge. It must be signed (and ideally encrypted) with a
// server-side secret before this is used in production.
export const SESSION_COOKIE_NAME = "finebase_session";

const VALID_ROLES: Role[] = ["CUSTOMER"];

export function encodeSession(user: User): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function decodeSession(value: string | undefined | null): User | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<User>;

    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      VALID_ROLES.includes(parsed.role as Role)
    ) {
      const createdAt = new Date(String(parsed.createdAt));

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role as Role,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
      };
    }

    return null;
  } catch {
    return null;
  }
}
