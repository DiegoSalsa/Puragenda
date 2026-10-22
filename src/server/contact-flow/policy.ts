import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  assertGrowthSandbox,
  revalidateGrowthScope,
  type GrowthScope,
} from "@/server/puri/growth/access";

// Source-level release seal. No environment variable, API key or UI action opens it.
export const CONTACT_FLOW_EXTERNAL_RELEASE = false as const;
export const CF_PURPOSE = "COMMERCIAL";
export function assertContactLab() {
  assertGrowthSandbox();
  if (process.env.CONTACT_FLOW_LAB_ENABLED !== "1")
    throw new Error("CONTACT_FLOW_DISABLED");
}
export function contactLabEnabled() {
  try {
    assertContactLab();
    return true;
  } catch {
    return false;
  }
}
export async function requireContactScope(scope: GrowthScope, owner = false) {
  assertContactLab();
  await revalidateGrowthScope(scope);
  if (!scope.canPrepare || !scope.canClients || (owner && !scope.owner))
    throw new Error("CONTACT_FLOW_FORBIDDEN");
}
export async function contactLock(tx: Prisma.TransactionClient) {
  // All quota, suppression, dispatch and authorization mutations use the same
  // short transaction lock. Claiming jobs remains parallel (SKIP LOCKED).
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(726841907)::text`;
}
export function tokenKey() {
  const key = process.env.CONTACT_FLOW_TOKEN_SECRET;
  if (!key || key.length < 32) throw new Error("CONTACT_FLOW_SECRET_REQUIRED");
  return key;
}
export function addressHash(businessId: string, email: string) {
  return createHmac("sha256", tokenKey())
    .update(`${businessId}:${email.trim().toLowerCase()}`)
    .digest("hex");
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function signature(value: string) {
  return createHmac("sha256", tokenKey()).update(value).digest("base64url");
}
export function signatureMatches(value: string, signed: string) {
  const a = Buffer.from(signature(value)),
    b = Buffer.from(signed);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const campaignInput = z
  .object({
    recommendationId: z.string().min(1).max(100),
    recommendationHash: z.string().regex(/^[a-f0-9]{64}$/),
    recommendationVersion: z.number().int().positive(),
    serviceId: z.string().min(1).max(100),
    startsAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    maxContacts: z.number().int().min(1).max(100),
    dailyLimit: z.number().int().min(1).max(10),
  })
  .strict();
export type CampaignInput = z.infer<typeof campaignInput>;
export const simulationSchema = z.enum([
  "SUCCESS",
  "REJECT",
  "BOUNCE",
  "TIMEOUT_ACCEPTED",
  "TIMEOUT_UNKNOWN",
  "RATE_LIMIT",
  "TEMPORARY",
  "NO_IDEMPOTENCY_TIMEOUT",
]);
export function backoff(attempt: number, key: string, retryAfter = 0) {
  const jitter = parseInt(digest(`${key}:${attempt}`).slice(0, 6), 16) % 1000;
  return Math.max(
    retryAfter,
    Math.min(3600000, 1000 * 2 ** Math.min(attempt, 12)) + jitter,
  );
}
export function syntheticAddress(email: string) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.invalid$/i.test(email);
}
