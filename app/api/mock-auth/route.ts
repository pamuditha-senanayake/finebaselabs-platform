import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticate } from "@/lib/api/users";
import {
  SESSION_COOKIE_NAME,
  decodeSession,
  encodeSession,
} from "@/lib/session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = await authenticate(email, password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ user });
}

export async function GET() {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return NextResponse.json({ user });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ user: null });
}
