import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

function getSecret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("Missing ADMIN_PASSWORD env");
  return createHmac("sha256", pw).update("licita-verify-session-key").digest("hex");
}

function sign(value: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function unsign(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;
  const value = signed.slice(0, dot);
  const expectedSig = signed.slice(dot + 1);
  const hmac = createHmac("sha256", getSecret());
  hmac.update(value);
  const actualSig = hmac.digest("hex");
  if (actualSig.length !== expectedSig.length) return null;
  try {
    return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig))
      ? value
      : null;
  } catch {
    return null;
  }
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  };
}

/**
 * Validates password against ADMIN_PASSWORD from env and sets a session cookie on the response.
 * Returns true if the password was correct and the cookie was set.
 */
export function createSession(response: NextResponse, password: string): boolean {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || password !== adminPw) return false;

  const payload = JSON.stringify({ authenticated: true, ts: Date.now() });
  response.cookies.set(COOKIE_NAME, sign(payload), cookieBase());
  return true;
}

/**
 * Reads and verifies the session cookie from the request.
 * Must be called from a server context (API route, server component).
 * Uses the async cookies() API from next/headers.
 */
export async function getSession(): Promise<{ authenticated: boolean; ts: number } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  const payload = unsign(cookie.value);
  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Removes the session cookie from the response.
 */
export function clearSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", { ...cookieBase(), maxAge: 0 });
}

/**
 * Verifies a session cookie from a raw string value.
 * Used by proxy.ts where NextRequest.cookies are sync.
 */
export function verifySessionCookieSync(cookieValue: string): boolean {
  const payload = unsign(cookieValue);
  if (!payload) return false;
  try {
    const data = JSON.parse(payload);
    if (data.authenticated !== true) return false;
    // Enforce 24h expiry from session creation
    if (Date.now() - data.ts > 86400000) return false;
    return true;
  } catch {
    return false;
  }
}
