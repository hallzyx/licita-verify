import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookieSync } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin/* routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow access to login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("admin_session");
  if (!sessionCookie?.value || !verifySessionCookieSync(sessionCookie.value)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
