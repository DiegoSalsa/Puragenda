import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

interface Options {
  namespace: string;
  windowMs: number;
  max: number;
  message: string;
}

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function distributedRateLimit(options: Options) {
  return {
    async check(request: NextRequest): Promise<NextResponse | null> {
      const key = createHash("sha256")
        .update(`${options.namespace}:${clientIp(request)}`)
        .digest("hex");
      const resetAt = new Date(Date.now() + options.windowMs);

      try {
        const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
          INSERT INTO "ApiRateLimitBucket" ("key", "count", "resetAt", "updatedAt")
          VALUES (${key}, 1, ${resetAt}, NOW())
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE
              WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN 1
              ELSE "ApiRateLimitBucket"."count" + 1
            END,
            "resetAt" = CASE
              WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN EXCLUDED."resetAt"
              ELSE "ApiRateLimitBucket"."resetAt"
            END,
            "updatedAt" = NOW()
          RETURNING "count", "resetAt"
        `;

        if (!bucket || bucket.count <= options.max) return null;
        const retryAfter = Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000));
        return NextResponse.json(
          { error: options.message, retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter) } },
        );
      } catch (error) {
        console.error(`[rate-limit/${options.namespace}] persistent limiter unavailable`, error);
        return NextResponse.json(
          { error: "Protección antiabuso temporalmente no disponible" },
          { status: 503, headers: { "Retry-After": "30" } },
        );
      }
    },
  };
}

export const analyticsDistributedLimiter = distributedRateLimit({
  namespace: "analytics",
  windowMs: 60_000,
  max: 120,
  message: "Demasiados eventos de analítica. Intenta nuevamente en un momento.",
});

export const consentDistributedLimiter = distributedRateLimit({
  namespace: "analytics-consent",
  windowMs: 3_600_000,
  max: 20,
  message: "Demasiados cambios de consentimiento. Intenta nuevamente más tarde.",
});

export const privacyDistributedLimiter = distributedRateLimit({
  namespace: "privacy-request",
  windowMs: 3_600_000,
  max: 5,
  message: "Demasiadas solicitudes de privacidad. Intenta nuevamente más tarde.",
});

export const contactDistributedLimiter = distributedRateLimit({
  namespace: "contact-lead",
  windowMs: 3_600_000,
  max: 5,
  message: "Demasiados mensajes de contacto. Intenta nuevamente más tarde.",
});

