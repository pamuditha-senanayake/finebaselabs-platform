import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isAuthenticated = session !== null;

  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const canAccessAdmin =
    session.role === "ADMIN" || session.role === "SUPPORT_AGENT";

  if (pathname.startsWith("/admin") && !canAccessAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
