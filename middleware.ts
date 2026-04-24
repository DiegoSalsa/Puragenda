import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "puragenda_session";

const PROTECTED_PREFIXES = ["/dashboard", "/api/dashboard"];
const ADMIN_PREFIXES = ["/admin", "/api/admin"];
const PUBLIC_API_PREFIX = "/api/business";

/**
 * Decode session payload from the cookie token.
 * Lightweight: only reads the payload, does NOT verify HMAC.
 * Full signature verification happens in user-session.ts on the server.
 */
function readSessionPayload(token: string): { isSuperAdmin?: boolean } | null {
  try {
    const [encodedPayload] = token.split(".");
    if (!encodedPayload) return null;

    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Handle CORS for public API ───
  if (pathname.startsWith(PUBLIC_API_PREFIX)) {
    return handleCorsResponse(request);
  }

  // ─── Protect SuperAdmin routes ───
  const isAdmin = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAdmin) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = readSessionPayload(token);
    if (!payload?.isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ─── Protect dashboard routes ───
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

function handleCorsResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const isPreflight = request.method === "OPTIONS";

  if (isPreflight) {
    const response = new NextResponse(null, { status: 204 });
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  const response = NextResponse.next();
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/business/:path*",
  ],
};
