import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "puragenda_session";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/api/dashboard"];

// Public API routes that need CORS handling
const PUBLIC_API_PREFIX = "/api/business";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Handle CORS for public API ───
  if (pathname.startsWith(PUBLIC_API_PREFIX)) {
    return handleCorsResponse(request);
  }

  // ─── Protect dashboard routes ───
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;

    if (!token) {
      // API routes return 401, pages redirect to login
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
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
    // Allow the origin temporarily; the actual route handler validates apiKey + allowedOrigins
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
    "/api/business/:path*",
  ],
};
