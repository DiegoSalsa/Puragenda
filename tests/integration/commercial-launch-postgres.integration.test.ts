import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { contactFixture, deleteContactFixture } from "../fixtures/contact-flow";
import { recordPublicConsent, updatePortalCommercialPreference, portalCommercialPreferences } from "@/server/contact-flow/public-consent";
import { consentEligibility, verifyConsentReceipt } from "@/server/contact-flow/consent";
import { addressHash, signature } from "@/server/contact-flow/policy";
import { reserveGrowthUsage, settleGrowthUsage, reconcileGrowthUsage, budgetKeys } from "@/server/puri/growth/budgets";
import { claimCommercialTick, runCommercialTick } from "@/server/commercial-worker";
import { createGrowthScope } from "@/server/puri/growth/access";
import { receiveResendEvent } from "@/server/contact-flow/events";
import { COMMERCIAL_CONSENT_VERSION } from "@/core/commercial-consent";
import { contactAddressAllowed } from "@/server/contact-flow/resend-test";
import { answerWithGrowthPuri } from "@/server/puri/growth/runtime";

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const fixtures: Awaited<ReturnType<typeof contactFixture>>[] = [];
const accounts: string[] = [];
async function fixture() {
  const f = await contactFixture({ consents: 0, prepare: false });
  for (const c of f.clients) {
    c.email = `${c.id}@example.invalid`;
    await prisma.client.update({ where: { id: c.id }, data: { email: c.email } });
  }
  fixtures.push(f); return f;
}
async function account(email: string, verified = true) {
  const a = await prisma.clientPortalAccount.create({ data: { email, name: "Synthetic portal", passwordHash: "synthetic-no-login", emailVerifiedAt: verified ? new Date() : null } });
  accounts.push(a.id); return a;
}
async function eligibility(businessId: string, clientId: string, email: string) {
  return prisma.$transaction(tx => consentEligibility(tx, businessId, clientId, addressHash(businessId, email)));
}
suite("Commercial launch consolidation / real isolated PostgreSQL", () => {
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    for (const f of fixtures.reverse()) await deleteContactFixture(f);
    await prisma.clientPortalAccount.deleteMany({ where: { id: { in: accounts } } });
    await prisma.commercialWorkerState.deleteMany({ where: { key: "PURAGENDA_NEXT" } });
    await prisma.$disconnect();
  });
  it("leaves historical customers ineligible and does not turn rejection into a booking requirement", async () => {
    vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "1");
    const f = await fixture(), c = f.clients[0];
    expect(await recordPublicConsent({ businessId: f.businessId, clientId: c.id, accepted: false, textVersion: COMMERCIAL_CONSENT_VERSION })).toEqual({ recorded: false });
    expect((await eligibility(f.businessId, c.id, c.email)).reason).toBe("NO_VERIFIED_CONSENT");
    expect(await prisma.cfConsent.count({ where: { businessId: f.businessId } })).toBe(0);
  });
  it("records a signed anonymous acceptance without granting delivery eligibility", async () => {
    vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "1");
    const f = await fixture(), c = f.clients[0];
    const input = { businessId: f.businessId, clientId: c.id, accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION, evidenceRef: `form:${randomUUID()}` };
    expect(await recordPublicConsent(input)).toMatchObject({ state: "PENDING_VERIFICATION" });
    await recordPublicConsent(input);
    const receipts = await prisma.cfConsent.findMany({ where: { businessId: f.businessId } });
    expect(receipts).toHaveLength(1); expect(verifyConsentReceipt(receipts[0])).toBe(true);
    expect((await eligibility(f.businessId, c.id, c.email)).reason).toBe("NO_VERIFIED_CONSENT");
    await expect(prisma.cfConsent.update({ where: { id: receipts[0].id }, data: { state: "GRANTED" } })).rejects.toThrow();
  });
  it("requires a persisted verified mailbox and tenant match before granting consent", async () => {
    vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "1");
    const f = await fixture(), c = f.clients[0], a = await account(c.email, false);
    expect(await recordPublicConsent({ businessId: f.businessId, clientId: c.id, accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION, verifiedAccount: a })).toMatchObject({ state: "PENDING_VERIFICATION" });
    await expect(updatePortalCommercialPreference(a, f.businessId, true)).rejects.toThrow("VERIFIED_ACCOUNT_REQUIRED");
    await prisma.clientPortalAccount.update({ where: { id: a.id }, data: { emailVerifiedAt: new Date() } });
    expect(await updatePortalCommercialPreference(a, f.businessId, true)).toMatchObject({ state: "GRANTED" });
    expect((await eligibility(f.businessId, c.id, c.email)).reason).toBeNull();
    const foreign = await fixture();
    await expect(updatePortalCommercialPreference(a, foreign.businessId, true)).rejects.toThrow();
    expect((await portalCommercialPreferences(a)).map(p => p.businessId)).toEqual([f.businessId]);
  });
  it("revocation stays authoritative after repeated opt-in and never transfers to a changed email", async () => {
    vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "1");
    const f = await fixture(), c = f.clients[0], a = await account(c.email);
    await updatePortalCommercialPreference(a, f.businessId, true);
    await prisma.client.update({ where: { id: c.id }, data: { email: `changed-${randomUUID()}@example.invalid` } });
    expect((await eligibility(f.businessId, c.id, `changed-${randomUUID()}@example.invalid`)).reason).toBe("NO_VERIFIED_CONSENT");
    await prisma.client.update({ where: { id: c.id }, data: { email: c.email } });
    await updatePortalCommercialPreference(a, f.businessId, false);
    await updatePortalCommercialPreference(a, f.businessId, true);
    expect((await eligibility(f.businessId, c.id, c.email)).reason).toBe("SUPPRESSED");
    expect((await portalCommercialPreferences(a))[0].state).toBe("SUPPRESSED");
  });
  it("keeps public collection closed in production regardless of flags", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CONTACT_FLOW_PUBLIC_CONSENT_ENABLED", "1");
    expect(await recordPublicConsent({ businessId: "foreign", clientId: "foreign", accepted: true, textVersion: COMMERCIAL_CONSENT_VERSION })).toEqual({ recorded: false });
  });
  it("reconciles ambiguous AI costs once under concurrent operators with audited evidence", async () => {
    const f = await fixture(); await prisma.user.update({ where: { id: f.user.id }, data: { isSuperAdmin: true } });
    const r = await reserveGrowthUsage({ businessId: f.businessId, category: "PLUS_INTERACTIVE", key: `reconcile:${randomUUID()}`, inputHash: "hash", micros: 100 });
    await settleGrowthUsage(r.reservation.id, { actualMicros: null });
    const input = { reservationId: r.reservation.id, actorId: f.user.id, actualMicros: 30, evidenceHash: "e".repeat(64) };
    const results = await Promise.all([reconcileGrowthUsage(input), reconcileGrowthUsage(input)]);
    expect(results.filter(r => r.duplicate)).toHaveLength(1);
    const bucket = await prisma.puriBudgetBucket.findUniqueOrThrow({ where: { key: budgetKeys(f.businessId, "PLUS_INTERACTIVE").keys[1] } });
    expect(bucket).toMatchObject({ spentMicros: 30, unknownCost: false, reservedMicros: 0 });
    await expect(reconcileGrowthUsage({ ...input, actualMicros: 0 })).rejects.toThrow("COST_RECONCILIATION_CONFLICT");
    await prisma.user.update({ where: { id: f.user.id }, data: { isSuperAdmin: false } });
    await expect(reconcileGrowthUsage(input)).rejects.toThrow("SUPERADMIN_REQUIRED");
  });
  it("allows one scheduler lease and recovers a crashed runner after expiration", async () => {
    vi.stubEnv("COMMERCIAL_WORKER_ENABLED", "1");
    await prisma.commercialWorkerState.deleteMany({ where: { key: "PURAGENDA_NEXT" } });
    const claims = await Promise.all(Array.from({ length: 8 }, () => claimCommercialTick()));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await runCommercialTick()).toEqual({ busy: true });
    const old = claims.find(Boolean)!;
    await prisma.commercialWorkerState.update({ where: { key: old.key }, data: { leaseUntil: new Date(Date.now() - 1) } });
    const recovered = await claimCommercialTick();
    expect(recovered!.fence).toBe(old.fence + 1); expect(recovered!.leaseOwner).not.toBe(old.leaseOwner);
    await prisma.commercialWorkerState.update({ where: { key: old.key }, data: { leaseOwner: null, leaseUntil: null } });
    vi.stubEnv("COMMERCIAL_WORKER_KILLED", "1");
    expect(await runCommercialTick()).toEqual({ killed: true });
    expect((await prisma.commercialWorkerState.findUniqueOrThrow({ where: { key: old.key } })).leaseOwner).toBeNull();
  });
  it("uses the same bounded paid recovery policy for Puri and expires at grace end", async () => {
    const f = await fixture();
    await prisma.commercialSubscription.update({ where: { businessId: f.businessId }, data: { status: "PAST_DUE_GRACE", provider: "MERCADO_PAGO", externalSubscriptionId: "synthetic-paid-contract", termsSnapshot: { origin: "registration_v2" }, periodEnd: new Date(Date.now() - 1000), gracePeriodEndsAt: new Date(Date.now() + 86400000) } });
    await expect(createGrowthScope(f.context)).resolves.toMatchObject({businessId:f.businessId});
    await prisma.commercialSubscription.update({where:{businessId:f.businessId},data:{gracePeriodEndsAt:new Date(Date.now()-1)}});
    await expect(createGrowthScope(f.context)).rejects.toThrow("PLUS_ENTITLEMENT_REQUIRED");
  });
  it("uses a real Svix signature and durable receipt correlation after a lost Resend response", async () => {
    const f = await contactFixture({ maximum: 1 }); fixtures.push(f);
    const m = await prisma.cfMessage.findFirstOrThrow({ where: { businessId: f.businessId } });
    await prisma.cfMessage.update({ where: { id: m.id }, data: { provider: "RESEND" } });
    const secretBytes = Buffer.alloc(32, 7), secret = `whsec_${secretBytes.toString("base64")}`;
    vi.stubEnv("CONTACT_FLOW_RESEND_WEBHOOK_SECRET", secret);
    const id = `msg_${randomUUID()}`, ts = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: `email-${randomUUID()}`, tags: { cf_message: m.id, cf_proof: signature(`resend:${m.id}`) } } });
    const sig = createHmac("sha256", secretBytes).update(`${id}.${ts}.${raw}`).digest("base64");
    const headers = new Headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` });
    expect(await receiveResendEvent(raw, headers)).toMatchObject({ accepted: true, simulated: false });
    expect(await receiveResendEvent(raw, headers)).toMatchObject({ duplicate: true });
    expect((await prisma.cfMessage.findUniqueOrThrow({ where: { id: m.id } })).state).toBe("DELIVERED");
    await expect(receiveResendEvent(raw + " ", headers)).rejects.toThrow();
  });
  it("rejects every uncontrolled destination even when a transactional provider key exists", () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-placeholder");
    expect(contactAddressAllowed("real-business", "customer@real.invalid")).toBe(false);
  });
  it("blocks an operation before contacting AI when its maximum charge exceeds the operation budget", async () => {
    const f = await fixture();
    vi.stubEnv("PURI_PLUS_AI_ENABLED", "1"); vi.stubEnv("PURI_PLUS_VERIFIED_PRICING_ENABLED", "1"); vi.stubEnv("PURI_PLUS_MAX_OPERATION_MICROS", "1");
    const transport = vi.fn();
    const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza las oportunidades", { transport });
    expect(result.errorCode).toBe("OPERATION_BUDGET_EXHAUSTED"); expect(transport).not.toHaveBeenCalled();
    expect(await prisma.puriUsageReservation.count({ where: { businessId: f.businessId, category: "PLUS_INTERACTIVE" } })).toBe(0);
  });
});
