import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

export const ACTIVE_COMMERCIAL_MIGRATION_STATES = ["PENDING_PROVIDER_CHANGE", "PENDING_RECONCILIATION", "SCHEDULED", "UNKNOWN"];
export async function assertNoOpenCommercialMigration(tx: Prisma.TransactionClient, businessId: string) {
  if (await tx.commercialMigrationProposal.findFirst({ where: { businessId, status: { in: ACTIVE_COMMERCIAL_MIGRATION_STATES } }, select: { id: true } })) throw new Error("COMMERCIAL_MIGRATION_OPEN");
}

// Production has no write switch. Preview needs explicit staging opt-in AND an
// exact connection fingerprint so copying ordinary app flags cannot open it.
export function assertCommercialSandbox() {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY");
  const url = new URL(process.env.DATABASE_URL || "postgres://invalid/invalid");
  const preview = process.env.VERCEL_ENV === "preview" && process.env.COMMERCIAL_V2_PREVIEW_ENABLED === "1" &&
    /^[a-f0-9]{64}$/.test(process.env.COMMERCIAL_V2_PREVIEW_DATABASE_SHA256 ?? "") &&
    createHash("sha256").update(url.href).digest("hex") === process.env.COMMERCIAL_V2_PREVIEW_DATABASE_SHA256;
  if (preview && process.env.COMMERCIAL_V2_INTERNAL_WRITES === "1") return;
  if (process.env.NODE_ENV === "production" || process.env.COMMERCIAL_V2_INTERNAL_WRITES !== "1" ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/puragenda_commercial_test(?:_[a-z0-9]+)?$/.test(url.pathname)) throw new Error("COMMERCIAL_WRITES_DISABLED");
}

export const COMMERCIAL_RELEASE_FLAGS = Object.freeze({
  billing: false, entitlements: false, seatChanges: false, puriPlus: false, contactFlow: false,
});

export function commercialHash(value: unknown): string {
  const canonical = (entry: unknown): unknown => {
    if (entry instanceof Date) return entry.toISOString();
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry && typeof entry === "object") return Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
    return entry;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function commercialInteger(value: number, minimum = 0) {
  // Prisma Int/PostgreSQL integer. Reject before attempting persistence.
  if (!Number.isSafeInteger(value) || value < minimum || value > 2_147_483_647) throw new Error("INVALID_COMMERCIAL_INTEGER");
  return value;
}
