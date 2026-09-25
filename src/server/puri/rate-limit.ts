import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";

const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 30;

export async function checkPuriRateLimit(key: string) {
  const hashed = createHash("sha256").update("puri:" + key).digest("hex");
  const resetAt = new Date(Date.now() + WINDOW_MS);
  const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "ApiRateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${hashed}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "ApiRateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "ApiRateLimitBucket"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "ApiRateLimitBucket"."resetAt" END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;
  return {
    allowed: Boolean(bucket && bucket.count <= MAX_REQUESTS),
    retryAfter: bucket ? Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000)) : 30,
  };
}

export const PURI_RATE_LIMIT = { windowMinutes: 10, maxRequests: MAX_REQUESTS };
