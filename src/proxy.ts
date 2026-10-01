import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeHostname, websiteSubdomain } from "@/websites/policy";

const AUTH_COOKIE = "puragenda_session";
const ADMIN_AUTH_COOKIE = "puragenda_admin_session";

const PROTECTED_PREFIXES = ["/dashboard", "/api/dashboard"];
const ADMIN_PREFIXES = ["/para/x7k9m2v4q8", "/api/admin"];
const ADMIN_LOGIN_PATH = "/para/x7k9m2v4q8/login";
const PUBLIC_API_PREFIX = "/api/business";

/**
 * Decode session payload from the cookie token.
 * Lightweight: only reads the payload, does NOT verify HMAC.
 * Full signature verification happens in user-session.ts on the server.
 */
function readSessionPayload(token: string): { isSuperAdmin?: boolean; adminAccess?: boolean } | null {
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

function hasAdminPanelCookie(request: NextRequest): boolean {
  if (request.cookies.get(ADMIN_AUTH_COOKIE)?.value) return true;

  const legacyToken = request.cookies.get(AUTH_COOKIE)?.value;
  if (!legacyToken) return false;
  const payload = readSessionPayload(legacyToken);
  return Boolean(payload?.isSuperAdmin && payload.adminAccess);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Host decides tenancy; forwarded headers and query parameters never do.
  const rawHost = request.headers.get("host") ?? request.nextUrl.host;
  let hostname: string;
  try { hostname = normalizeHostname(rawHost); } catch { return new NextResponse(null, { status: 400 }); }
  // Next rewrites may replace Host. Always overwrite this internal header from
  // the validated transport host, including on platform/API/direct requests.
  const websiteHeaders = new Headers(request.headers);
  websiteHeaders.set("x-puragenda-website-host", rawHost);
  const root = process.env.WEBSITE_ROOT_DOMAIN || "puragenda.cl";
  const platformHosts = new Set(["localhost", "127.0.0.1", "www.puragenda.cl", "puragenda.cl", "puragenda.vercel.app", ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : [])]);
  if (process.env.NEXT_PUBLIC_APP_URL) { try { platformHosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL).hostname); } catch { /* Invalid app URL does not broaden allowed hosts. */ } }
  const localNetwork = process.env.NODE_ENV === "development" && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  const tenantHost = !!websiteSubdomain(hostname, root) || !localNetwork && !platformHosts.has(hostname) && !hostname.endsWith(".vercel.app");
  if (tenantHost && !pathname.startsWith("/api/website/") && !pathname.startsWith("/_next/") && !pathname.startsWith("/websites/")) {
    const url = new URL(request.url);
    if (pathname === "/") url.pathname = `/sites/${hostname}`;
    else if (pathname === "/robots.txt") url.pathname = "/api/website/robots";
    else if (pathname === "/sitemap.xml") url.pathname = "/api/website/sitemap";
    else return new NextResponse(null, { status: 404 });
    return NextResponse.rewrite(url, { request: { headers: websiteHeaders } });
  }
  if (pathname.startsWith("/api/website/") || pathname.startsWith("/sites/")) return NextResponse.next({ request: { headers: websiteHeaders } });

  if (pathname === "/dashboard/website/preview") {
    const url = new URL(request.url); url.pathname = "/website-preview";
    return NextResponse.rewrite(url, { request: { headers: websiteHeaders }, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store" } });
  }

  // ─── Handle CORS for public API ───
  if (pathname.startsWith(PUBLIC_API_PREFIX)) {
    // Headless reads are server-to-server; retain the legacy widget CORS policy.
    if (/\/api\/business\/[^/]+\/(booking-catalog|availability)\/?$/.test(pathname)) {
      return request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();
    }
    return handleCorsResponse(request);
  }

  // ─── Protect SuperAdmin routes ───
  const isAdmin = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAdmin) {
    // Allow access to admin login page without auth
    if (pathname === ADMIN_LOGIN_PATH) {
      return NextResponse.next();
    }

    if (!hasAdminPanelCookie(request)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
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
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, Idempotency-Key, Puragenda-Booking-Version");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  const response = NextResponse.next();
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, Idempotency-Key, Puragenda-Booking-Version");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$).*)",
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/para/x7k9m2v4q8/:path*",
    "/api/admin/:path*",
    "/api/business/:path*",
  ],
};
