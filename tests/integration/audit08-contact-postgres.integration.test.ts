import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { contactFixture, deleteContactFixture, syntheticContactPolicy } from "../fixtures/contact-flow";
import { authorizeCampaign, controlCampaign, contactSnapshot, campaignRecipients } from "@/server/contact-flow/campaigns";
import { claimContactJob, dispatchContactClaim, runContactWorker } from "@/server/contact-flow/worker";
import { enrollmentToken } from "@/server/contact-flow/tokens";
import { consentEligibility } from "@/server/contact-flow/consent";
import { recordPublicConsent, updatePortalCommercialPreference } from "@/server/contact-flow/public-consent";
import { addressHash } from "@/server/contact-flow/policy";
import { COMMERCIAL_CONSENT_VERSION } from "@/core/commercial-consent";
import { GET as optOutGet, POST as optOutPost } from "@/app/contact-flow/unsubscribe/route";

const fixtures: Awaited<ReturnType<typeof contactFixture>>[] = [];
const accounts: string[] = [];
async function fixture(options: Parameters<typeof contactFixture>[0] = {}) {
  const f = await contactFixture(options); fixtures.push(f); return f;
}
async function tokenFor(f: Awaited<ReturnType<typeof fixture>>) {
  const m = await prisma.cfMessage.findFirstOrThrow({ where: { businessId: f.businessId } });
  return prisma.$transaction(tx => enrollmentToken(tx, m.enrollmentId, f.businessId, "UNSUBSCRIBE", new Date(Date.now() + 3600000)));
}
// A separate PostgreSQL connection proves the application is waiting on the
// same lock. There are no time-based assumptions about when authorization ran.
async function whileWaiting<T>(start: () => Promise<T>, mutate: (connection: pg.Client) => Promise<unknown>) {
  const connection = new pg.Client({ connectionString: process.env.COMMERCIAL_V2_TEST_DATABASE_URL });
  await connection.connect(); await connection.query("BEGIN");
  await connection.query("SELECT pg_advisory_xact_lock(726841907)");
  const pending = start().then(value => ({ value }), error => ({ error }));
  try {
    const deadline = Date.now() + 4000;
    while (true) {
      await connection.query("SELECT pg_stat_clear_snapshot()");
      const waiting = await connection.query("SELECT 1 FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND wait_event='advisory' AND query LIKE '%726841907%'");
      if (waiting.rowCount) break;
      if (Date.now() > deadline) throw Error("CONTACT_LOCK_WAIT_NOT_OBSERVED");
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await mutate(connection); await connection.query("COMMIT");
    return await pending;
  } finally { await connection.query("ROLLBACK"); await connection.end(); }
}

describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)("Auditoría 08 / PostgreSQL aislado", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
  afterAll(async () => {
    for (const f of fixtures.reverse()) await deleteContactFixture(f);
    await prisma.clientPortalAccount.deleteMany({ where: { id: { in: accounts } } });
    await prisma.$disconnect();
  });
  it.each([
    ["paid", true], ["trial", true], ["trial-expired", false], ["authorized-not-paid", false],
    ["expired", false], ["grace", true], ["grace-expired", false], ["cancel-renewal-paid", true],
    ["basic", false], ["inactive", false], ["deleted-business", false], ["deleted-user", false], ["legacy", false],
  ] as const)("applies central commercial access at delivery: %s", async (scenario, allowed) => {
    const f = await fixture({ maximum: 1, trial: scenario === "trial" });
    const now = Date.now(); const update: Prisma.CommercialSubscriptionUpdateInput = {};
    if (scenario === "trial-expired") Object.assign(update, { status: "TRIALING", trialStart: new Date(now - 86400000), trialEnd: new Date(now - 1000), lastPaymentStatus: null, lastPaymentAt: null, lastPaymentEventId: null });
    if (scenario === "authorized-not-paid") Object.assign(update, { status: "PENDING_PAYMENT", lastPaymentStatus: "AUTHORIZED", lastPaymentEventId: null });
    if (scenario === "expired") update.periodEnd = new Date(now - 1000);
    if (scenario === "basic") update.planCode = "PURAGENDA";
    if (scenario === "inactive") update.status = "INACTIVE";
    if (scenario === "legacy") update.planCode = "EQUIPO";
    if (scenario === "cancel-renewal-paid") Object.assign(update, { renewalCancellationStatus: "CANCELLED_VERIFIED", renewalCancelledAt: new Date(now - 1000) });
    if (scenario.startsWith("grace")) {
      const policy = { ...syntheticContactPolicy, campaignsPerPeriod: 3, maxContactsPerCampaign: 50 };
      const budget = { limitMicros: 1000000, limitUnits: 1000000 };
      const puri = { ALL: budget, ANALYSIS_SQL: budget, RECOMMENDATION: budget, PLUS_INTERACTIVE: budget, STANDARD_INTERACTIVE: budget };
      vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify({ version: "synthetic-audit08", trial: {}, paid: { PURAGENDA_PLUS: { contactFlow: policy, puri } }, global: { contactFlow: policy, puri: budget } }));
      Object.assign(update, { provider: "MERCADO_PAGO", externalSubscriptionId: "synthetic-" + f.businessId, termsSnapshot: { origin: "registration_v2" }, periodEnd: new Date(now - (scenario === "grace" ? 3600000 : 49 * 3600000)) });
    }
    await prisma.commercialSubscription.update({ where: { businessId: f.businessId }, data: update });
    if (scenario === "deleted-business") await prisma.business.update({ where: { id: f.businessId }, data: { deletedAt: new Date() } });
    if (scenario === "deleted-user") await prisma.user.update({ where: { id: f.scope.actorId }, data: { deletedAt: new Date() } });
    const result = await runContactWorker({ businessId: f.businessId, limit: 1 });
    expect(await prisma.cfSimulatedReceipt.count({ where: { businessId: f.businessId } }), JSON.stringify(result)).toBe(allowed ? 1 : 0);
    expect(await prisma.cfCampaign.count({ where: { businessId: f.businessId } })).toBe(1);
  });
  it.each(["owner", "deleted", "downgrade", "location"])("rechecks %s after authorization waits for the Contact Flow lock", async change => {
    const f = await fixture({ authorize: false, maximum: 1 });
    const v = await prisma.cfVersion.findFirstOrThrow({ where: { campaignId: f.campaignId! } });
    const result = await whileWaiting(() => authorizeCampaign(f.scope, f.campaignId!, v.contentHash, v.version, true), async c => {
      if (change === "owner") await c.query('UPDATE "Business" SET "ownerId"=NULL WHERE id=$1', [f.businessId]);
      if (change === "deleted") await c.query('UPDATE "User" SET "deletedAt"=NOW() WHERE id=$1', [f.scope.actorId]);
      if (change === "downgrade") await c.query('UPDATE "CommercialSubscription" SET "planCode"=\'PURAGENDA\' WHERE "businessId"=$1', [f.businessId]);
      if (change === "location") await c.query('UPDATE "BusinessLocation" SET "isActive"=false WHERE id=$1', [f.location.id]);
    });
    expect(result).toHaveProperty("error");
    expect(await prisma.cfAuthorization.count({ where: { businessId: f.businessId } })).toBe(0);
    expect(await prisma.cfOutbox.count({ where: { businessId: f.businessId } })).toBe(0);
  });
  it("does not resume a campaign with authority revoked while waiting", async () => {
    const f = await fixture({ maximum: 1 });
    await controlCampaign(f.scope, f.campaignId!, "PAUSE");
    const result = await whileWaiting(() => controlCampaign(f.scope, f.campaignId!, "RESUME"), c => c.query('UPDATE "BusinessLocation" SET "isActive"=false WHERE id=$1', [f.location.id]));
    expect(result).toHaveProperty("error");
    expect(await prisma.cfCampaign.findUnique({ where: { id: f.campaignId! } })).toMatchObject({ status: "PAUSED" });
  });
  it.each(["downgrade", "unsubscribe", "cancel"])("worker rechecks %s committed while waiting and never invokes the provider", async change => {
    const f = await fixture({ maximum: 1 }); const claim = await claimContactJob("audit08", new Date(), f.businessId);
    const result = await whileWaiting(() => dispatchContactClaim(claim!), async c => {
      if (change === "downgrade") await c.query('UPDATE "CommercialSubscription" SET "planCode"=\'PURAGENDA\' WHERE "businessId"=$1', [f.businessId]);
      if (change === "cancel") await c.query('UPDATE "CfCampaign" SET status=\'CANCELLED\' WHERE id=$1', [f.campaignId]);
      if (change === "unsubscribe") await c.query('UPDATE "CfConsent" SET state=\'REVOKED\',"revokedAt"=clock_timestamp() AT TIME ZONE \'UTC\' WHERE "businessId"=$1', [f.businessId]);
    });
    expect(result).not.toHaveProperty("error");
    expect(await prisma.cfSimulatedReceipt.count({ where: { businessId: f.businessId } })).toBe(0);
    expect(await prisma.cfCampaign.count({ where: { businessId: f.businessId } })).toBe(1);
  });
  it("ten concurrent workers claim each message once across three isolated businesses", async () => {
    const tenants = await Promise.all([fixture({ maximum: 2 }), fixture({ maximum: 2 }), fixture({ maximum: 2 })]);
    // Fixture construction updates the shared policy; all sends start afterward.
    const ids = tenants.map(f => f.businessId);
    await Promise.all(Array.from({ length: 10 }, (_, index) => runContactWorker({ businessId: ids[index % 3], limit: 2 })));
    for (const f of tenants) {
      expect(await prisma.cfSimulatedReceipt.count({ where: { businessId: f.businessId } })).toBe(2);
      expect(await prisma.cfAttempt.count({ where: { businessId: f.businessId } })).toBe(2);
    }
    for (const foreign of tenants.slice(1)) {
      await expect(campaignRecipients(tenants[0].scope, foreign.campaignId!)).rejects.toThrow();
      expect((await contactSnapshot(tenants[0].scope)).campaigns.some(c => c.id === foreign.campaignId)).toBe(false);
    }
  });
  it("does not release quota or claim a definitive failure when rejection follows an ambiguous attempt", async () => {
    const f = await fixture({ maximum: 1 });
    const message = await prisma.cfMessage.findFirstOrThrow({ where: { businessId: f.businessId } });
    await prisma.cfMessage.update({ where: { id: message.id }, data: { simulation: "TIMEOUT_UNKNOWN" } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    await prisma.cfMessage.update({ where: { id: message.id }, data: { simulation: "REJECT" } });
    await prisma.cfOutbox.update({ where: { messageId: message.id }, data: { nextAttemptAt: new Date(0) } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    expect(await prisma.cfMessage.findUnique({ where: { id: message.id } })).toMatchObject({ state: "UNKNOWN" });
    expect(await prisma.cfOutbox.findUnique({ where: { messageId: message.id } })).toMatchObject({ state: "UNKNOWN" });
    expect(await prisma.cfQuotaReservation.findUnique({ where: { messageId: message.id } })).toMatchObject({ state: "CONSUMED" });
  });
  it("refuses a changed idempotency key after an ambiguous result without sending again", async () => {
    const f = await fixture({ maximum: 1 });
    const message = await prisma.cfMessage.findFirstOrThrow({ where: { businessId: f.businessId } });
    await prisma.cfMessage.update({ where: { id: message.id }, data: { simulation: "TIMEOUT_UNKNOWN" } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    await prisma.cfMessage.update({ where: { id: message.id }, data: { idempotencyKey: "changed:" + message.id, simulation: "SUCCESS" } });
    await prisma.cfOutbox.update({ where: { messageId: message.id }, data: { nextAttemptAt: new Date(0) } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    expect(await prisma.cfAttempt.count({ where: { messageId: message.id } })).toBe(1);
    expect(await prisma.cfSimulatedReceipt.count({ where: { messageId: message.id } })).toBe(0);
    expect(await prisma.cfMessage.findUnique({ where: { id: message.id } })).toMatchObject({ state: "UNKNOWN" });
    expect(await prisma.cfQuotaReservation.findUnique({ where: { messageId: message.id } })).toMatchObject({ state: "CONSUMED" });
  });
  it("retains an ambiguous commitment through a day and month rollover", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2030-01-31T23:59:30Z"));
    const prior = await prisma.cfQuotaBucket.findUnique({ where: { key: "global:day:2030-01-31" } });
    const oldDay = (prior?.reserved ?? 0) + (prior?.consumed ?? 0);
    const priorMonth = await prisma.cfQuotaBucket.findUnique({ where: { key: "global:month:2030-01" } });
    const oldMonth = (priorMonth?.reserved ?? 0) + (priorMonth?.consumed ?? 0);
    const f = await fixture({ maximum: 1 });
    const message = await prisma.cfMessage.findFirstOrThrow({ where: { businessId: f.businessId } });
    await prisma.cfMessage.update({ where: { id: message.id }, data: { simulation: "TIMEOUT_UNKNOWN" } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    vi.setSystemTime(new Date("2030-02-01T00:00:30Z"));
    await prisma.cfOutbox.update({ where: { messageId: message.id }, data: { nextAttemptAt: new Date(0) } });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    for (const [key, previous] of [["global:day:2030-01-31", oldDay], ["global:month:2030-01", oldMonth]] as const) {
      const bucket = await prisma.cfQuotaBucket.findUniqueOrThrow({ where: { key } });
      expect(bucket.consumed + bucket.reserved).toBe(previous + 1);
    }
    expect(await prisma.cfMessage.findUnique({ where: { id: message.id } })).toMatchObject({ state: "UNKNOWN" });
    expect(await prisma.cfAttempt.count({ where: { messageId: message.id } })).toBe(1);
  });
  it("GET is prefetch-safe, concurrent POSTs are idempotent, and disabled sending still permits opt-out", async () => {
    const f = await fixture({ maximum: 1 }); const token = await tokenFor(f);
    const request = (method: string) => new NextRequest(`http://localhost/contact-flow/unsubscribe?token=${token}`, { method });
    const get = await optOutGet(request("GET"));
    expect(await get.text()).toContain("Confirmar baja comercial");
    expect(get.headers.get("referrer-policy")).toBe("no-referrer");
    expect(get.headers.get("cache-control")).toBe("no-store");
    expect(await prisma.cfSuppression.count({ where: { businessId: f.businessId } })).toBe(0);
    vi.stubEnv("PURAGENDA_NEXT_ENABLED", "0"); vi.stubEnv("CONTACT_FLOW_LAB_ENABLED", "0"); vi.stubEnv("PURI_PLUS_INTERNAL_ENABLED", "0");
    const responses = await Promise.all([optOutPost(request("POST")), optOutPost(request("POST"))]);
    for (const response of responses) expect(await response.text()).toContain("quedó registrada");
    expect(await prisma.cfSuppression.count({ where: { businessId: f.businessId, reason: "UNSUBSCRIBE" } })).toBe(1);
    expect(await prisma.cfAudit.count({ where: { businessId: f.businessId, event: "UNSUBSCRIBED" } })).toBe(1);
  });
  it("anonymous consent never grants a mailbox and a verified opt-in never removes suppression", async () => {
    const f = await fixture({ consents: 0, maximum: 1, authorize: false }); const client = f.clients[0];
    const account = await prisma.clientPortalAccount.upsert({ where: { email: client.email }, update: {}, create: { email: client.email, name: "Synthetic", passwordHash: "synthetic-disabled", emailVerifiedAt: new Date() } }); accounts.push(account.id);
    expect(await recordPublicConsent({ businessId: f.businessId, clientId: client.id, accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION })).toMatchObject({ state: "PENDING_VERIFICATION" });
    expect(await prisma.$transaction(tx => consentEligibility(tx, f.businessId, client.id, addressHash(f.businessId, client.email)))).toMatchObject({ reason: "NO_VERIFIED_CONSENT" });
    await recordPublicConsent({ businessId: f.businessId, clientId: client.id, accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION, verifiedAccount: { id: account.id, email: "other@example.invalid" } });
    expect(await prisma.cfConsent.count({ where: { businessId: f.businessId, state: "GRANTED" } })).toBe(0);
    await updatePortalCommercialPreference(account, f.businessId, false);
    await updatePortalCommercialPreference(account, f.businessId, true);
    expect(await prisma.$transaction(tx => consentEligibility(tx, f.businessId, client.id, addressHash(f.businessId, client.email)))).toMatchObject({ reason: "SUPPRESSED" });
  });
  it("a verified portal user can revoke when new public consent and sending are disabled", async () => {
    const f = await fixture({ maximum: 1 }); const client = f.clients[0];
    const account = await prisma.clientPortalAccount.upsert({ where: { email: client.email }, update: {}, create: { email: client.email, name: "Synthetic", passwordHash: "synthetic-disabled", emailVerifiedAt: new Date() } }); accounts.push(account.id);
    vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "0"); vi.stubEnv("PURAGENDA_NEXT_ENABLED", "0"); vi.stubEnv("CONTACT_FLOW_LAB_ENABLED", "0"); vi.stubEnv("PURI_PLUS_INTERNAL_ENABLED", "0");
    await expect(updatePortalCommercialPreference(account, f.businessId, false)).resolves.toMatchObject({ state: "REVOKED" });
    await expect(updatePortalCommercialPreference(account, f.businessId, true)).rejects.toThrow();
  });
});
