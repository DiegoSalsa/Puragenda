import { prisma } from "@/server/db/prisma";
export async function cleanupMcpData(now = new Date()) {
  const dayAgo = new Date(now.getTime() - 86400000);
  return prisma.$transaction(async (db) => {
    const requests = await db.mcpOAuthRequest.deleteMany({ where: { expiresAt: { lt: dayAgo } } });
    const codes = await db.mcpOAuthCode.deleteMany({ where: { expiresAt: { lt: dayAgo } } });
    const tokens = await db.mcpOAuthToken.deleteMany({ where: { refreshExpiresAt: { lt: now } } });
    const payloads = await db.mcpOperation.updateMany({ where: { createdAt: { lt: dayAgo }, encryptedPayload: { not: "" } }, data: { encryptedPayload: "" } });
    const buckets = await db.apiRateLimitBucket.deleteMany({ where: { resetAt: { lt: dayAgo } } });
    // Retain operation hashes/results as tombstones, and stable profile IDs.
    return { requests: requests.count, codes: codes.count, tokens: tokens.count, payloads: payloads.count, expiredRateBuckets: buckets.count };
  });
}
