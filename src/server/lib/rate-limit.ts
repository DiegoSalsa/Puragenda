import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter for API routes.
 *
 * Uses a Map to track request counts per IP within a sliding window.
 * The map is automatically cleaned up on each check to prevent memory leaks.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
 *   export async function POST(request: NextRequest) {
 *     const blocked = limiter.check(request);
 *     if (blocked) return blocked;
 *     // ... handle request
 *   }
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window per IP */
  max: number;
  /** Custom message for 429 response */
  message?: string;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || "").split(",").map(ip => ip.trim()).filter(Boolean);

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message } = options;

  // Each limiter instance gets its own store
  const storeKey = `${windowMs}-${max}-${Math.random()}`;
  const store = new Map<string, RateLimitEntry>();
  stores.set(storeKey, store);

  return {
    /**
     * Check if the request should be rate-limited.
     * Returns a 429 Response if blocked, or null if allowed.
     */
    check(request: NextRequest): NextResponse | null {
      const ip = getClientIp(request);

      // Bypass rate limit for whitelisted IPs
      if (ip !== "unknown" && WHITELISTED_IPS.includes(ip)) {
        return null;
      }

      const now = Date.now();

      // Cleanup expired entries (prevent memory leak in long-running serverless)
      if (store.size > 10000) {
        for (const [key, entry] of store) {
          if (entry.resetAt <= now) store.delete(key);
        }
      }

      const existing = store.get(ip);

      if (!existing || existing.resetAt <= now) {
        // First request or window expired — start fresh
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return null;
      }

      // Within window — increment
      existing.count++;

      if (existing.count > max) {
        const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
        return NextResponse.json(
          {
            error: message || "Demasiadas solicitudes. Intenta de nuevo más tarde.",
            retryAfter: retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
              "X-RateLimit-Limit": String(max),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(existing.resetAt),
            },
          }
        );
      }

      return null;
    },
  };
}

// ── Pre-configured limiters for common routes ──

/** Login: 5 attempts per 15 minutes */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiados intentos de inicio de sesión. Espera 15 minutos.",
});

/** SuperAdmin code requests: 5 attempts per 15 minutes per IP */
export const adminCodeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiadas solicitudes de código. Espera 15 minutos.",
});

/** SuperAdmin code verification: 15 attempts per 15 minutes per IP */
export const adminCodeVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Demasiados intentos de verificación. Espera 15 minutos.",
});

/** Register: 3 attempts per 60 minutes */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Demasiados intentos de registro. Espera 1 hora.",
});

/** Booking: 10 bookings per 5 minutes */
export const bookingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Demasiadas reservas en poco tiempo. Espera unos minutos.",
});

/** Public appointment actions: 20 previews/actions per 15 minutes */
export const appointmentActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Demasiados intentos sobre esta cita. Espera unos minutos.",
});

/** Client portal magic links: 5 requests per 15 minutes per IP */
export const clientPortalLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiadas solicitudes de acceso. Espera 15 minutos.",
});

/** Client portal password login: 8 attempts per 15 minutes per IP. */
export const clientPortalLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Demasiados intentos de acceso. Espera 15 minutos.",
});

/** Client account activation/reset emails: 4 requests per hour per IP. */
export const clientPortalAccountEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 4,
  message: "Demasiadas solicitudes de correo. Espera una hora.",
});

/** Billing: 5 attempts per 15 minutes */
export const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiados intentos de pago. Espera 15 minutos.",
});

/** Availability story rendering: 30 previews/downloads per 10 minutes */
export const availabilityStoryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Generaste muchas historias en poco tiempo. Espera unos minutos.",
});

/** Product analytics: enough room for a normal browsing session, while preventing write abuse. */
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Demasiados eventos de analítica. Intenta nuevamente en un momento.",
});

/** Marketing: 3 sends per 60 minutes */
export const marketingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Demasiados envíos de campaña. Espera 1 hora.",
});
