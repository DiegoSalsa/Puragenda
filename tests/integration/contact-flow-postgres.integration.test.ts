import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import {
  contactFixture,
  deleteContactFixture,
  syntheticContactPolicy,
} from "../fixtures/contact-flow";
import {
  authorizeCampaign,
  contactSnapshot,
  controlCampaign,
  prepareCampaign,
  campaignRecipients,
} from "@/server/contact-flow/campaigns";
import {
  recordConsent,
  revokeConsent,
  verifyConsentReceipt,
} from "@/server/contact-flow/consent";
import { digest } from "@/server/contact-flow/policy";
import { signature } from "@/server/contact-flow/policy";
import { ensureCommercialContactPolicy } from "@/server/services/commercial-usage-policy";
import { configureContactPolicy } from "@/server/contact-flow/quotas";
import { reserveContactQuota } from "@/server/contact-flow/quotas";
import { contactLock } from "@/server/contact-flow/policy";
import {
  claimContactJob,
  dispatchContactClaim,
  runContactWorker,
} from "@/server/contact-flow/worker";
import {
  enrollmentToken,
  unsubscribe,
  resolveToken,
  bookingDestination,
} from "@/server/contact-flow/tokens";
import {
  receiveSimulatedEvent,
  reconcileSimulatedDeliveries,
  simulatedEventSignature,
  receiveResendEvent,
} from "@/server/contact-flow/events";
import { createAppointment } from "@/server/services/appointment.service";
import { contactResults } from "@/server/contact-flow/metrics";
import { purgeContactFlow } from "@/server/contact-flow/retention";
import { executeGrowthTool } from "@/server/puri/growth/tools";
import { configureGrowthBudget } from "@/server/puri/growth/budgets";
const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const fixtures: Awaited<ReturnType<typeof contactFixture>>[] = [];
async function fixture(o: Parameters<typeof contactFixture>[0] = {}) {
  const f = await contactFixture(o);
  fixtures.push(f);
  return f;
}
async function messages(businessId: string) {
  return prisma.cfMessage.findMany({
    where: { businessId },
    include: {
      outbox: true,
      enrollment: { include: { version: true, client: true } },
    },
    orderBy: { id: "asc" },
  });
}
async function tokenFor(businessId: string, kind: "BOOKING" | "UNSUBSCRIBE") {
  const [m] = await messages(businessId);
  return prisma.$transaction((tx) =>
    enrollmentToken(
      tx,
      m.enrollmentId,
      businessId,
      kind,
      new Date(Date.now() + 86400000),
    ),
  );
}
async function bookedWithAttribution(
  f: Awaited<ReturnType<typeof contactFixture>>,
  totalPrice: number | undefined = 10000,
) {
  await runContactWorker({ businessId: f.businessId });
  const value = await tokenFor(f.businessId, "BOOKING"),
    [m] = await messages(f.businessId),
    start = f.day(-10);
  const result = await createAppointment(
    {
      businessId: f.businessId,
      locationId: f.location.id,
      serviceId: f.service.id,
      clientId: m.enrollment.clientId,
      customerName: "Synthetic attributed booking",
      customerEmail: m.enrollment.client.email,
      customerPhone: "",
      startTime: start,
      endTime: new Date(+start + 3600000),
      contactFlowToken: value,
      totalPrice,
    },
    { syncGoogle: false },
  );
  if (!result.success) throw new Error("SYNTHETIC_BOOKING_FAILED");
  return result.appointment;
}
suite("Contact Flow / real isolated PostgreSQL", () => {
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    for (const f of fixtures.reverse()) await deleteContactFixture(f);
    await prisma.$disconnect();
  });
  async function registrationPolicy(f: Awaited<ReturnType<typeof fixture>>) {
    await prisma.commercialSubscription.update({ where: { businessId: f.businessId }, data: { termsSnapshot: { origin: "registration_v2" } } });
    const contactFlow = { ...syntheticContactPolicy, campaignsPerPeriod: 1, maxContactsPerCampaign: 2, trialLimit: 2 };
    const puri = { ALL: { limitMicros: 1000000, limitUnits: 1000000 }, ANALYSIS_SQL: { limitMicros: 0, limitUnits: 1000000 } };
    vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify({ version: "synthetic-qa-not-commercial", trial: { PURAGENDA_PLUS: { contactFlow, puri } }, paid: { PURAGENDA_PLUS: { contactFlow, puri } }, global: { puri: puri.ALL, contactFlow: { ...contactFlow, dailyLimit: 100000, monthlyLimit: 1000000 } } }));
  }
  it("initializes registered-plan policy before preparation and consumes one campaign slot under concurrent authorization", async () => {
    const f = await fixture({ prepare: false }); await registrationPolicy(f);
    await prisma.cfPolicy.delete({ where: { key: f.businessId } });
    await expect(prepareCampaign(f.scope, { ...f.input, maxContacts: 3, dailyLimit: 2 })).rejects.toThrow("CAMPAIGN_CONTACT_LIMIT");
    const c = await prepareCampaign(f.scope, { ...f.input, maxContacts: 2, dailyLimit: 2 });
    const v = await prisma.cfVersion.findFirstOrThrow({ where: { campaignId: c.id } });
    await Promise.all([authorizeCampaign(f.scope, c.id, v.contentHash, v.version, true), authorizeCampaign(f.scope, c.id, v.contentHash, v.version, true)]);
    expect(await prisma.cfQuotaBucket.findFirst({ where: { businessId: f.businessId, kind: "BUSINESS_CAMPAIGNS" } })).toMatchObject({ limit: 1, consumed: 1 });
    expect(await prisma.cfAuthorization.count({ where: { businessId: f.businessId } })).toBe(1);
    await controlCampaign(f.scope, c.id, "CANCEL");
    expect(await prisma.cfQuotaBucket.findFirst({ where: { businessId: f.businessId, kind: "BUSINESS_CAMPAIGNS" } })).toMatchObject({ consumed: 1 });
  });
  it("keeps operator kill switches set after every commercial policy refresh", async () => {
    const f = await fixture(); await registrationPolicy(f);
    await prisma.cfPolicy.updateMany({ where: { key: { in: [f.businessId, "GLOBAL"] } }, data: { killed: true } });
    await prisma.$transaction(async tx => { await contactLock(tx); await ensureCommercialContactPolicy(tx, f.businessId, new Date()); });
    expect((await prisma.cfPolicy.findMany({ where: { key: { in: [f.businessId, "GLOBAL"] } } })).every(p => p.killed)).toBe(true);
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId)).every(m => !m.acceptedAt)).toBe(true);
  });
  it("provides tenant-scoped recipient review only to the owner and keeps identities out of AI snapshots", async () => {
    const f = await fixture({ authorize: false }), other = await fixture({ prepare: false });
    const review = await campaignRecipients(f.scope, f.campaignId!);
    expect(review.recipients.length).toBeGreaterThan(0); expect(review.recipients[0].email).toContain("@example.invalid");
    expect(JSON.stringify(await contactSnapshot(f.scope))).not.toContain(review.recipients[0].email);
    await expect(campaignRecipients(other.scope, f.campaignId!)).rejects.toThrow();
    await expect(campaignRecipients({ ...f.scope, owner: false }, f.campaignId!)).rejects.toThrow();
  });
  it("authenticates provider suppression events locally and never restores eligibility on a later delivery", async () => {
    const f = await fixture({ maximum: 1 }), [m] = await messages(f.businessId), providerId = randomUUID();
    await prisma.cfMessage.update({ where: { id: m.id }, data: { provider: "RESEND", providerId } });
    const secretBytes = Buffer.from("synthetic-webhook-secret-not-a-provider-credential");
    for (const [key, value] of Object.entries({ CONTACT_FLOW_RESEND_TEST_ENABLED: "1", CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT: "1", CONTACT_FLOW_RESEND_TEST_BUSINESS_ID: f.businessId, CONTACT_FLOW_RESEND_TEST_RECIPIENTS: JSON.stringify([m.enrollment.client.email]), CONTACT_FLOW_RESEND_FROM: "sender@example.invalid", CONTACT_FLOW_RESEND_DOMAIN_ID: "synthetic", CONTACT_FLOW_RESEND_API_KEY: "re_synthetic", CONTACT_FLOW_RESEND_WEBHOOK_SECRET: `whsec_${secretBytes.toString("base64")}`, CONTACT_FLOW_PUBLIC_ORIGIN: "https://synthetic.invalid" })) vi.stubEnv(key, value);
    async function event(type: string) {
      const id = randomUUID(), ts = String(Math.floor(Date.now() / 1000));
      const raw = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: providerId, tags: { cf_message: m.id, cf_proof: signature(`resend:${m.id}`) } } });
      return receiveResendEvent(raw, new Headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${createHmac("sha256", secretBytes).update(`${id}.${ts}.${raw}`).digest("base64")}` }));
    }
    await event("email.suppressed"); await event("email.delivered");
    expect(await prisma.cfMessage.findUnique({ where: { id: m.id } })).toMatchObject({ state: "FAILED" });
    expect(await prisma.cfSuppression.count({ where: { businessId: f.businessId, reason: "ADMIN_BLOCK", sourceRef: { startsWith: "provider:RESEND:" } } })).toBe(1);
  });
  it("preserves UNKNOWN and quota when consent is revoked after an ambiguous timeout", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "TIMEOUT_UNKNOWN" },
    });
    await runContactWorker({ businessId: f.businessId });
    const [m] = await messages(f.businessId);
    await revokeConsent(f.scope, m.enrollment.clientId);
    await runContactWorker({
      businessId: f.businessId,
      now: new Date(+m.outbox!.nextAttemptAt + 10),
    });
    expect((await messages(f.businessId))[0].state).toBe("UNKNOWN");
    expect(
      await prisma.cfQuotaReservation.findFirst({
        where: { businessId: f.businessId, state: "CONSUMED" },
      }),
    ).not.toBeNull();
  });
  it("cancellation does not erase an ambiguous delivery or release its quota", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "TIMEOUT_UNKNOWN" },
    });
    await runContactWorker({ businessId: f.businessId });
    await controlCampaign(f.scope, f.campaignId!, "CANCEL");
    const [m] = await messages(f.businessId);
    expect(m.state).toBe("UNKNOWN");
    expect(m.outbox?.state).toBe("UNKNOWN");
    expect(
      await prisma.cfQuotaReservation.findFirst({
        where: { businessId: f.businessId, state: "CONSUMED" },
      }),
    ).not.toBeNull();
  });
  it("rotates reserved business-day quotas across local midnight while UTC day stays the same", async () => {
    const f = await fixture({ maximum: 1 }),
      [m] = await messages(f.businessId),
      v = { ...m.enrollment.version, timezone: "America/Santiago" },
      first = new Date("2026-10-22T02:59:00Z"),
      second = new Date("2026-10-22T03:01:00Z");
    for (const now of [first, second])
      expect(
        await prisma.$transaction(async (tx) => {
          await contactLock(tx);
          return reserveContactQuota(tx, m, m.enrollment, v, now);
        }),
      ).toBeNull();
    const buckets = await prisma.cfQuotaBucket.findMany({
      where: { businessId: f.businessId, kind: "BUSINESS_DAY" },
      orderBy: { period: "asc" },
    });
    expect(buckets.map((b) => [b.period, b.reserved])).toEqual([
      ["2026-10-21", 0],
      ["2026-10-22", 1],
    ]);
  });
  it("counts a historically recorded settlement without using the current service price", async () => {
    const f = await fixture({ maximum: 1 }),
      a = await bookedWithAttribution(f, 8000);
    await prisma.appointment.update({
      where: { id: a.id },
      data: { status: "COMPLETED", settledAt: new Date() },
    });
    await prisma.service.update({
      where: { id: f.service.id },
      data: { price: 99999 },
    });
    expect(await contactResults(f.scope, f.campaignId!)).toMatchObject({
      reservations: 1,
      completed: 1,
      knownRevenue: 8000,
      recordedRevenue: 8000,
      unknownAmounts: 0,
      accepted: 1,
      eligible: 1,
    });
  });
  it("subtracts a recorded refund from a historical settlement", async () => {
    const f = await fixture({ maximum: 1 }),
      a = await bookedWithAttribution(f);
    await prisma.appointment.update({
      where: { id: a.id },
      data: { status: "COMPLETED", settledAt: new Date() },
    });
    await prisma.posPayment.create({
      data: {
        businessId: f.businessId,
        appointmentId: a.id,
        status: "REFUNDED",
        amount: 2500,
        currency: f.scope.currencyCode,
        externalReference: `synthetic-refund:${a.id}`,
        idempotencyKey: `synthetic-refund:${a.id}`,
      },
    });
    expect(await contactResults(f.scope, f.campaignId!)).toMatchObject({
      refunded: 1,
      knownRevenue: 7500,
      recordedRevenue: 7500,
    });
  });
  it("reports cancellation separately and does not count a cancelled reservation as completed revenue", async () => {
    const f = await fixture({ maximum: 1 }),
      a = await bookedWithAttribution(f);
    await prisma.appointment.update({
      where: { id: a.id },
      data: { status: "CANCELLED", settledAt: new Date() },
    });
    expect(await contactResults(f.scope, f.campaignId!)).toMatchObject({
      reservations: 1,
      completed: 0,
      cancelled: 1,
      knownRevenue: 0,
    });
  });
  it("lets the same Puri prepare an approved campaign without authorizing delivery", async () => {
    const f = await fixture({ prepare: false });
    const result = await executeGrowthTool(
      "prepare_contact_campaign",
      {
        recommendationId: f.rec.id,
        contentHash: f.rec.contentHash,
        version: f.rec.version,
      },
      f.scope,
    );
    expect(result).toMatchObject({
      status: "DRAFT",
      authorizationRequired: true,
      externalBlocked: true,
    });
    expect(await messages(f.businessId)).toHaveLength(0);
  });
  it("never exposes an AI authorization or execution tool", async () => {
    const f = await fixture();
    for (const name of [
      "authorize_contact_campaign",
      "send_contact_campaign",
      "execute_contact_flow",
      "change_subscription",
    ])
      await expect(executeGrowthTool(name, {}, f.scope)).rejects.toThrow(
        "UNKNOWN_TOOL",
      );
  });
  it("enforces a composite tenant foreign key for the campaign professional", async () => {
    const a = await fixture(),
      b = await fixture({ prepare: false }),
      staff = await prisma.staff.create({
        data: { businessId: a.businessId, name: "Synthetic foreign staff" },
      });
    await expect(
      prisma.cfCampaign.create({
        data: {
          businessId: b.businessId,
          scopeKey: b.scope.scopeKey,
          locationId: b.location.id,
          staffId: staff.id,
          recommendationId: b.rec.id,
          createdById: b.user.id,
        },
      }),
    ).rejects.toThrow();
  });
  it("verifies the signed consent receipt and detects modified provenance or accepted text", async () => {
    const f = await fixture();
    const c = await prisma.cfConsent.findFirstOrThrow({
      where: { businessId: f.businessId },
    });
    expect(verifyConsentReceipt(c)).toBe(true);
    expect(
      verifyConsentReceipt({ ...c, evidenceRef: "synthetic:forged" }),
    ).toBe(false);
    expect(verifyConsentReceipt({ ...c, acceptedText: "altered" })).toBe(false);
  });
  it("requires an explicit consent choice and disallows invented historical receipts", async () => {
    const f = await fixture();
    const c = await prisma.cfConsent.findFirstOrThrow({
        where: { businessId: f.businessId },
      }),
      input = {
        clientId: c.clientId,
        source: c.source,
        textVersion: c.textVersion,
        evidenceRef: "synthetic:new",
        evidenceHash: c.evidenceHash,
        grantedAt: new Date().toISOString(),
      };
    await expect(recordConsent(f.scope, input)).rejects.toThrow();
    await expect(
      recordConsent(f.scope, {
        ...input,
        accepted: true,
        grantedAt: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).rejects.toThrow("INVALID_CONSENT_EVIDENCE");
  });
  it("enforces the global platform quota across two concurrent businesses", async () => {
    const a = await fixture({ maximum: 1 }),
      b = await fixture({ maximum: 1 }),
      bucket = await prisma.cfQuotaBucket.findUnique({
        where: { key: `global:day:${new Date().toISOString().slice(0, 10)}` },
      }),
      limit = (bucket?.consumed ?? 0) + (bucket?.reserved ?? 0) + 1;
    await configureContactPolicy("GLOBAL", {
      ...syntheticContactPolicy,
      dailyLimit: limit,
      monthlyLimit: 1000000,
    });
    await Promise.all([
      runContactWorker({ businessId: a.businessId }),
      runContactWorker({ businessId: b.businessId }),
    ]);
    expect(
      await prisma.cfMessage.count({
        where: {
          businessId: { in: [a.businessId, b.businessId] },
          acceptedAt: { not: null },
        },
      }),
    ).toBe(1);
  });
  it("recovers a committed STARTED attempt after a worker crash with the same idempotency key", async () => {
    const f = await fixture({ maximum: 1 }),
      now = new Date(),
      first = await claimContactJob("crashed", now, f.businessId);
    await prisma.cfOutbox.update({
      where: { id: first!.id },
      data: { state: "SENDING", attempts: 1, firstAttemptAt: now },
    });
    const second = await claimContactJob(
      "replacement",
      new Date(+now + 31000),
      f.businessId,
    );
    expect(
      (await dispatchContactClaim(second!, new Date(+now + 31000))).state,
    ).toBe("ACCEPTED");
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(1);
  });
  it("preserves ambiguity after a crashed attempt for a non-idempotent provider", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "NO_IDEMPOTENCY_TIMEOUT" },
    });
    const now = new Date(),
      first = await claimContactJob("crashed", now, f.businessId);
    await prisma.cfOutbox.update({
      where: { id: first!.id },
      data: { state: "SENDING", attempts: 1, firstAttemptAt: now },
    });
    const later = new Date(+now + 31000),
      second = await claimContactJob("replacement", later, f.businessId);
    expect((await dispatchContactClaim(second!, later)).state).toBe("UNKNOWN");
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("cancellation preserves a provider acceptance whose response was lost", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "TIMEOUT_ACCEPTED" },
    });
    await runContactWorker({ businessId: f.businessId });
    await controlCampaign(f.scope, f.campaignId!, "CANCEL");
    const [m] = await messages(f.businessId);
    expect(m.state).toBe("ACCEPTED");
    expect(
      await prisma.cfQuotaReservation.findFirst({
        where: { businessId: f.businessId, state: "CONSUMED" },
      }),
    ).not.toBeNull();
    await reconcileSimulatedDeliveries(f.businessId);
    expect((await messages(f.businessId))[0].state).toBe("DELIVERED");
  });
  it("rechecks changes to the recipient address instead of transferring old consent", async () => {
    const f = await fixture({ maximum: 1 }),
      [m] = await messages(f.businessId);
    await prisma.client.update({
      where: { id: m.enrollment.clientId },
      data: { email: "new-address@example.invalid" },
    });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].outbox?.lastError).toBe(
      "ADDRESS_CHANGED",
    );
  });
  it("freezes sender identity in the authorized hash and blocks later sender changes", async () => {
    const f = await fixture({ maximum: 1 });
    await configureContactPolicy(f.businessId, {
      ...syntheticContactPolicy,
      senderEmail: "changed@example.invalid",
    });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].outbox?.lastError).toBe(
      "CONTACT_POLICY_CHANGED",
    );
  });
  it("keeps proposal approval distinct from execution authorization and stores frozen evidence", async () => {
    const f = await fixture({ authorize: false });
    expect(f.rec.status).toBe("APPROVED");
    expect(await messages(f.businessId)).toHaveLength(0);
    const s = await contactSnapshot(f.scope);
    expect(s.campaigns[0]).toMatchObject({
      eligible: 5,
      excluded: 0,
      status: "DRAFT",
    });
    expect(s.campaigns[0].version.evidenceHash).toBe(f.rec.evidenceHash);
    expect(s.externalBlocked).toBe(true);
  });
  it("does not infer consent from legacy acceptsMarketing, even when all six are true", async () => {
    const f = await fixture({ consents: 0, authorize: false });
    const s = await contactSnapshot(f.scope);
    expect(s.campaigns[0]).toMatchObject({
      eligible: 0,
      excluded: 5,
      exclusions: { NO_VERIFIED_CONSENT: 5 },
    });
    const v = s.campaigns[0].version;
    await expect(
      authorizeCampaign(f.scope, f.campaignId!, v.contentHash, v.version, true),
    ).rejects.toThrow("NO_ELIGIBLE_RECIPIENTS");
  });
  it("preserves verifiable consent source, evidence hash, text version, purpose, channel and operator", async () => {
    const f = await fixture();
    const c = await prisma.cfConsent.findFirstOrThrow({
      where: { businessId: f.businessId },
    });
    expect(c).toMatchObject({
      source: "SYNTHETIC_FORM",
      textVersion: "cf-commercial-email-v1",
      purpose: "COMMERCIAL",
      channel: "EMAIL",
      recordedById: f.user.id,
      state: "GRANTED",
    });
    expect(c.addressHash).toHaveLength(64);
    expect(JSON.stringify(c)).not.toContain("@example.invalid");
  });
  it("rejects unverifiable historical consent inputs", async () => {
    const f = await fixture();
    await expect(
      recordConsent(f.scope, {
        clientId: f.clients[0].id,
        source: "LEGACY_ACCEPTS_MARKETING",
        textVersion: "v1",
        evidenceRef: "synthetic:x",
        evidenceHash: digest("x"),
        grantedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });
  it("deduplicates verified form evidence and rejects an evidence conflict", async () => {
    const f = await fixture();
    const c = await prisma.cfConsent.findFirstOrThrow({
        where: { businessId: f.businessId },
      }),
      input = {
        clientId: c.clientId,
        source: "SYNTHETIC_FORM",
        accepted: true,
        textVersion: c.textVersion,
        evidenceRef: c.evidenceRef,
        evidenceHash: c.evidenceHash,
        grantedAt: c.grantedAt.toISOString(),
      };
    expect((await recordConsent(f.scope, input)).id).toBe(c.id);
    await expect(
      recordConsent(f.scope, { ...input, evidenceHash: digest("altered") }),
    ).rejects.toThrow("CONSENT_IDEMPOTENCY_CONFLICT");
  });
  it("requires explicit execution permission and an exact hash and version", async () => {
    const f = await fixture({ authorize: false }),
      v = (await contactSnapshot(f.scope)).campaigns[0].version;
    await expect(
      authorizeCampaign(
        f.scope,
        f.campaignId!,
        v.contentHash,
        v.version,
        false,
      ),
    ).rejects.toThrow("EXPLICIT_EXECUTION_AUTHORIZATION_REQUIRED");
    await expect(
      authorizeCampaign(
        f.scope,
        f.campaignId!,
        "0".repeat(64),
        v.version,
        true,
      ),
    ).rejects.toThrow("CAMPAIGN_VERSION_CONFLICT");
    await expect(
      authorizeCampaign(
        f.scope,
        f.campaignId!,
        v.contentHash,
        v.version + 1,
        true,
      ),
    ).rejects.toThrow("CAMPAIGN_VERSION_CONFLICT");
  });
  it("creates exactly one authorization and outbox under concurrent duplicate approval", async () => {
    const f = await fixture({ authorize: false }),
      v = (await contactSnapshot(f.scope)).campaigns[0].version;
    await Promise.all(
      [1, 2].map(() =>
        authorizeCampaign(
          f.scope,
          f.campaignId!,
          v.contentHash,
          v.version,
          true,
        ),
      ),
    );
    expect(await messages(f.businessId)).toHaveLength(5);
    expect(
      await prisma.cfAuthorization.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(1);
  });
  it("versions changed draft configuration and rejects the obsolete review hash", async () => {
    const f = await fixture({ authorize: false }),
      old = (await contactSnapshot(f.scope)).campaigns[0].version;
    await prepareCampaign(
      f.scope,
      { ...f.input, maxContacts: 3, dailyLimit: 3 },
      new Date(),
      f.campaignId!,
    );
    const updated = (await contactSnapshot(f.scope)).campaigns[0];
    expect(updated.version.version).toBe(2);
    expect(updated.eligible).toBe(3);
    await expect(
      authorizeCampaign(f.scope, f.campaignId!, old.contentHash, 1, true),
    ).rejects.toThrow("CAMPAIGN_VERSION_CONFLICT");
  });
  it("rejects mutation of an authorized campaign", async () => {
    const f = await fixture();
    await expect(
      prepareCampaign(
        f.scope,
        { ...f.input, maxContacts: 1, dailyLimit: 1 },
        new Date(),
        f.campaignId!,
      ),
    ).rejects.toThrow("CAMPAIGN_IMMUTABLE_AFTER_AUTHORIZATION");
  });
  it("rejects arbitrary DSL, discounts, recipients, SQL and channels", async () => {
    const f = await fixture({ prepare: false });
    for (const extra of [
      { channel: "SMS" },
      { sql: "SELECT * FROM Client" },
      { discount: 20 },
      { recipients: [f.clients[0].id] },
      { objective: "EXFILTRATE" },
      { body: "send clinical details" },
    ])
      await expect(
        prepareCampaign(f.scope, { ...f.input, ...extra }),
      ).rejects.toThrow();
  });
  it("rejects cross-tenant campaign and service identifiers", async () => {
    const a = await fixture(),
      b = await fixture({ prepare: false });
    await expect(contactResults(b.scope, a.campaignId!)).rejects.toThrow();
    await expect(
      prepareCampaign(b.scope, { ...b.input, serviceId: a.service.id }),
    ).rejects.toThrow();
  });
  it("rejects cross-tenant consent even at the SQL foreign key boundary", async () => {
    const a = await fixture(),
      b = await fixture();
    await expect(
      prisma.cfConsent.create({
        data: {
          businessId: b.businessId,
          clientId: a.clients[0].id,
          addressHash: "0".repeat(64),
          source: "SYNTHETIC_FORM",
          acceptedText: "synthetic",
          evidenceSignature: "s".repeat(43),
          recordedById: b.user.id,
          textVersion: "cf-commercial-email-v1",
          evidenceRef: "synthetic:cross",
          evidenceHash: "0".repeat(64),
          grantedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
  it("does not expose recipient identities or private CRM notes in campaign summaries or tools", async () => {
    const f = await fixture();
    for (const result of [
      await contactSnapshot(f.scope),
      await executeGrowthTool("get_contact_campaigns", {}, f.scope),
    ])
      expect(JSON.stringify(result)).not.toMatch(
        /PRIVATE_CLIENT|PRIVATE_NOTES|private-\d@example|customerEmail|addressHash|clientId/,
      );
  });
  it("analyzes, prepares, authorizes and simulates a campaign during a Plus trial without payment evidence", async () => {
    const f = await fixture({ trial: true, maximum: 2 });
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.businessId } });
    expect(sub.status).toBe("TRIALING"); expect(sub.lastPaymentAt).toBeNull();
    // Explicit synthetic quota exercises the same central policy as registration.
    await prisma.commercialSubscription.update({ where: { id: sub.id }, data: { termsSnapshot: { origin: "registration_v2" } } });
    vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify({ version: "synthetic-cf-trial", trial: { PURAGENDA_PLUS: { puri: Object.fromEntries(["ALL", "STANDARD_INTERACTIVE", "PLUS_INTERACTIVE", "RECOMMENDATION", "ANALYSIS_SQL", "PROACTIVE_SQL"].map(category => [category, { limitMicros: 1000000000, limitUnits: 1000000000 }])), contactFlow: { ...syntheticContactPolicy, trialLimit: 1 } } }, paid: {}, global: { puri: { limitMicros: 1000000000, limitUnits: 1000000000 }, contactFlow: { ...syntheticContactPolicy, dailyLimit: 100000, monthlyLimit: 1000000 } } }));
    expect(await runContactWorker({ businessId: f.businessId, limit: 2 })).toMatchObject({ simulated: true });
    expect((await messages(f.businessId)).filter(m => m.state === "ACCEPTED")).toHaveLength(1);
    expect(await prisma.cfQuotaBucket.findFirst({ where: { businessId: f.businessId, kind: "BUSINESS_TRIAL" } })).toMatchObject({ limit: 1, consumed: 1, reserved: 0 });
    await runContactWorker({ businessId: f.businessId, limit: 2 });
    expect((await messages(f.businessId)).filter(m => m.state === "ACCEPTED")).toHaveLength(1);
  });
  it("sends only through a durable claimed job and records simulated provider acceptance", async () => {
    const f = await fixture();
    expect(
      await runContactWorker({ businessId: f.businessId, limit: 1 }),
    ).toMatchObject({ processed: 1, simulated: true });
    const ms = await messages(f.businessId);
    expect(ms.filter((m) => m.state === "ACCEPTED")).toHaveLength(1);
    expect(
      await prisma.cfAttempt.count({
        where: { businessId: f.businessId, outcome: "ACCEPTED" },
      }),
    ).toBe(1);
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(1);
    expect(ms.filter((m) => m.state === "DELIVERED")).toHaveLength(0);
  });
  it("claims different jobs concurrently with SKIP LOCKED", async () => {
    const f = await fixture();
    const claims = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((i) =>
        claimContactJob(`w${i}`, new Date(), f.businessId),
      ),
    );
    const ids = claims.filter(Boolean).map((c) => c!.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });
  it("fences an expired worker after a newer worker reclaims its lease", async () => {
    const f = await fixture({ maximum: 1 });
    const now = new Date(),
      first = await claimContactJob("old", now, f.businessId),
      later = new Date(+now + 31000),
      second = await claimContactJob("new", later, f.businessId);
    expect(second?.fence).toBe(2);
    expect(await dispatchContactClaim(first!, later)).toEqual({
      state: "FENCED",
    });
    expect((await dispatchContactClaim(second!, later)).state).toBe("ACCEPTED");
  });
  it("atomically prevents two concurrent workers exceeding the same daily business quota", async () => {
    const f = await fixture();
    await configureContactPolicy(f.businessId, {
      ...syntheticContactPolicy,
      dailyLimit: 1,
    });
    const claims = await Promise.all([
      claimContactJob("one", new Date(), f.businessId),
      claimContactJob("two", new Date(), f.businessId),
    ]);
    await Promise.all(claims.map((c) => dispatchContactClaim(c!)));
    expect(
      (await messages(f.businessId)).filter((m) => m.acceptedAt),
    ).toHaveLength(1);
    const b = await prisma.cfQuotaBucket.findFirstOrThrow({
      where: { businessId: f.businessId, kind: "BUSINESS_DAY" },
    });
    expect(b.consumed + b.reserved).toBe(1);
  });
  it("enforces monthly quota independently of daily quota", async () => {
    const f = await fixture();
    await configureContactPolicy(f.businessId, {
      ...syntheticContactPolicy,
      monthlyLimit: 1,
    });
    await runContactWorker({ businessId: f.businessId, limit: 5 });
    expect(
      (await messages(f.businessId)).filter((m) => m.acceptedAt),
    ).toHaveLength(1);
  });
  it("enforces campaign quota and persists excluded volume", async () => {
    const f = await fixture({ maximum: 2 });
    const s = await contactSnapshot(f.scope);
    expect(s.campaigns[0]).toMatchObject({
      eligible: 2,
      excluded: 3,
      exclusions: { CAMPAIGN_LIMIT: 3 },
    });
    await runContactWorker({ businessId: f.businessId, limit: 5 });
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(2);
  });
  it("revocation committed after authorization excludes the contact before dispatch", async () => {
    const f = await fixture({ maximum: 1 });
    const [m] = await messages(f.businessId);
    await revokeConsent(f.scope, m.enrollment.clientId);
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].state).toBe("EXCLUDED");
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("a secure idempotent anonymous unsubscribe wins over prior authorization", async () => {
    const f = await fixture({ maximum: 1 }),
      token = await tokenFor(f.businessId, "UNSUBSCRIBE");
    expect(await unsubscribe(token)).toEqual({ unsubscribed: true });
    expect(await unsubscribe(token)).toEqual({ unsubscribed: true });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].state).toBe("EXCLUDED");
    expect(
      await prisma.cfSuppression.count({ where: { businessId: f.businessId } }),
    ).toBe(1);
    expect(
      await prisma.appointment.count({
        where: { businessId: f.businessId, reminderSent: false },
      }),
    ).toBeGreaterThan(0);
  });
  it("rejects token tampering, wrong purpose and expiry without disclosing a contact", async () => {
    const f = await fixture({ maximum: 1 }),
      value = await tokenFor(f.businessId, "BOOKING");
    await expect(unsubscribe(value)).rejects.toThrow("INVALID_CONTACT_TOKEN");
    await expect(
      unsubscribe(value.slice(0, -1) + (value.endsWith("a") ? "b" : "a")),
    ).rejects.toThrow("INVALID_CONTACT_TOKEN");
    await expect(
      prisma.$transaction((tx) =>
        resolveToken(tx, value, "BOOKING", new Date(Date.now() + 2 * 86400000)),
      ),
    ).rejects.toThrow("INVALID_CONTACT_TOKEN");
    expect(value).not.toContain(f.clients[0].id);
  });
  for (const key of ["business", "global"] as const)
    it(`honors the ${key} kill switch immediately`, async () => {
      const f = await fixture({ maximum: 1 });
      await configureContactPolicy(key === "global" ? "GLOBAL" : f.businessId, {
        ...syntheticContactPolicy,
        killed: true,
      });
      await runContactWorker({ businessId: f.businessId });
      expect(
        await prisma.cfSimulatedReceipt.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(0);
      expect((await messages(f.businessId))[0].outbox?.lastError).toBe(
        "KILL_SWITCH",
      );
    });
  it("honors channel disablement independently of kill switches", async () => {
    const f = await fixture({ maximum: 1 });
    await configureContactPolicy(f.businessId, {
      ...syntheticContactPolicy,
      emailEnabled: false,
    });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].outbox?.lastError).toBe(
      "CHANNEL_DISABLED",
    );
  });
  it("pauses claims, resumes only with authorization and cancels queued jobs", async () => {
    const f = await fixture();
    await controlCampaign(f.scope, f.campaignId!, "PAUSE");
    expect(
      await claimContactJob("worker", new Date(), f.businessId),
    ).toBeNull();
    await controlCampaign(f.scope, f.campaignId!, "RESUME");
    expect(
      (await runContactWorker({ businessId: f.businessId, limit: 1 }))
        .processed,
    ).toBe(1);
    await controlCampaign(f.scope, f.campaignId!, "CANCEL");
    expect(
      (await messages(f.businessId)).filter((m) => m.state === "EXCLUDED"),
    ).toHaveLength(4);
    expect(
      await prisma.cfAuthorization.count({
        where: { businessId: f.businessId, revokedAt: null },
      }),
    ).toBe(0);
  });
  it("rechecks current subscription entitlement before attempting delivery", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.commercialSubscription.update({
      where: { businessId: f.businessId },
      data: { status: "CANCELLED" },
    });
    await runContactWorker({ businessId: f.businessId });
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("rechecks the owner's account and effective operation permission", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.user.update({
      where: { id: f.user.id },
      data: { deletedAt: new Date() },
    });
    await runContactWorker({ businessId: f.businessId });
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("does not send an invented price after a catalog change", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.service.update({
      where: { id: f.service.id },
      data: { price: 99999 },
    });
    await runContactWorker({ businessId: f.businessId });
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("requires renewed evidence review after underlying bookings change", async () => {
    const f = await fixture({ maximum: 1 });
    await f.appointment(3, { totalPrice: 10000 });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].outbox?.lastError).toBe(
      "EVIDENCE_CHANGED",
    );
  });
  it("continues an authorized gradual campaign across midnight while rechecking the original evidence and current recipients", async () => {
    const f = await fixture({ prepare: false, maximum: 2 });
    const c = await prepareCampaign(f.scope, { ...f.input, dailyLimit: 1, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString() });
    const v = await prisma.cfVersion.findFirstOrThrow({ where: { campaignId: c.id } });
    await authorizeCampaign(f.scope, c.id, v.contentHash, v.version, true);
    await runContactWorker({ businessId: f.businessId, limit: 2 });
    expect((await messages(f.businessId)).filter(m => m.state === "ACCEPTED")).toHaveLength(1);
    const tomorrow = new Date(Date.now() + 86400000 + 60000);
    for (const category of ["ALL", "ANALYSIS_SQL"] as const) await configureGrowthBudget({ businessId: f.businessId, category, limitMicros: 1000000, limitUnits: 1000000, now: tomorrow });
    await configureGrowthBudget({ businessId: null, category: "ALL", limitMicros: 1000000000, limitUnits: 1000000000, now: tomorrow });
    await runContactWorker({ businessId: f.businessId, limit: 2, now: tomorrow });
    expect((await messages(f.businessId)).filter(m => m.state === "ACCEPTED")).toHaveLength(2);
  });
  for (const scenario of ["RATE_LIMIT", "TEMPORARY"] as const)
    it(`retries ${scenario} with bounded backoff and one stable provider key`, async () => {
      const f = await fixture({ maximum: 1 });
      await prisma.cfMessage.updateMany({
        where: { businessId: f.businessId },
        data: { simulation: scenario },
      });
      let now = new Date();
      for (let i = 0; i < 3; i++) {
        await runContactWorker({ businessId: f.businessId, now, limit: 1 });
        const [m] = await messages(f.businessId);
        now = new Date(+m.outbox!.nextAttemptAt + 10);
      }
      const [m] = await messages(f.businessId);
      expect(m.state).toBe("ACCEPTED");
      expect(m.outbox?.attempts).toBe(3);
      expect(
        await prisma.cfSimulatedReceipt.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(1);
    });
  it("recovers provider acceptance with a lost response without sending twice", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "TIMEOUT_ACCEPTED" },
    });
    await runContactWorker({ businessId: f.businessId, limit: 1 });
    let [m] = await messages(f.businessId);
    expect(m.state).toBe("QUEUED");
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(1);
    await runContactWorker({
      businessId: f.businessId,
      now: new Date(+m.outbox!.nextAttemptAt + 10),
      limit: 1,
    });
    [m] = await messages(f.businessId);
    expect(m.state).toBe("ACCEPTED");
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(1);
  });
  it("never automatically retries an ambiguous provider without idempotency", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "NO_IDEMPOTENCY_TIMEOUT" },
    });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].state).toBe("UNKNOWN");
    expect(
      (
        await runContactWorker({
          businessId: f.businessId,
          now: new Date(Date.now() + 3600000),
        })
      ).processed,
    ).toBe(0);
    expect(
      await prisma.cfQuotaReservation.findFirst({
        where: { businessId: f.businessId, state: "CONSUMED" },
      }),
    ).not.toBeNull();
  });
  it("caps ambiguous idempotent retries and preserves UNKNOWN for reconciliation", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "TIMEOUT_UNKNOWN" },
    });
    let now = new Date();
    for (let i = 0; i < 6; i++) {
      await runContactWorker({ businessId: f.businessId, now });
      const [m] = await messages(f.businessId);
      now = new Date(+m.outbox!.nextAttemptAt + 10);
    }
    const [m] = await messages(f.businessId);
    expect(m.state).toBe("UNKNOWN");
    expect(m.outbox?.attempts).toBe(5);
    expect(
      await prisma.cfSimulatedReceipt.count({
        where: { businessId: f.businessId },
      }),
    ).toBe(0);
  });
  it("does not retry permanent rejection and releases unused quota", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "REJECT" },
    });
    await runContactWorker({ businessId: f.businessId });
    expect((await messages(f.businessId))[0].state).toBe("FAILED");
    expect(
      await prisma.cfQuotaReservation.findFirst({
        where: { businessId: f.businessId, state: "RELEASED" },
      }),
    ).not.toBeNull();
  });
  it("authenticates and deduplicates simulated events before processing delivery", async () => {
    const f = await fixture({ maximum: 1 });
    await runContactWorker({ businessId: f.businessId });
    const [m] = await messages(f.businessId),
      raw = JSON.stringify({
        id: "delivery1",
        providerId: m.providerId,
        kind: "DELIVERED",
        occurredAt: new Date().toISOString(),
      }),
      ts = String(Math.floor(Date.now() / 1000));
    await expect(receiveSimulatedEvent(raw, ts, "invalid")).rejects.toThrow(
      "INVALID_WEBHOOK_SIGNATURE",
    );
    await receiveSimulatedEvent(raw, ts, simulatedEventSignature(raw, ts));
    expect(
      await receiveSimulatedEvent(raw, ts, simulatedEventSignature(raw, ts)),
    ).toEqual({ duplicate: true });
    expect((await messages(f.businessId))[0].state).toBe("DELIVERED");
  });
  it("reconciles a lost acknowledgement through provider evidence and suppresses hard bounces", async () => {
    const f = await fixture({ maximum: 1 });
    await prisma.cfMessage.updateMany({
      where: { businessId: f.businessId },
      data: { simulation: "BOUNCE" },
    });
    await runContactWorker({ businessId: f.businessId });
    await reconcileSimulatedDeliveries(f.businessId);
    expect((await messages(f.businessId))[0].state).toBe("BOUNCED");
    expect(
      await prisma.cfSuppression.findFirst({
        where: { businessId: f.businessId, reason: "HARD_BOUNCE" },
      }),
    ).not.toBeNull();
  });
  it("never lets a late delivered event erase a spam suppression", async () => {
    const f = await fixture({ maximum: 1 });
    await runContactWorker({ businessId: f.businessId });
    const [m] = await messages(f.businessId);
    for (const [id, kind] of [
      ["spam", "COMPLAINED"],
      ["late", "DELIVERED"],
    ]) {
      const raw = JSON.stringify({
          id,
          providerId: m.providerId,
          kind,
          occurredAt: new Date().toISOString(),
        }),
        ts = String(Math.floor(Date.now() / 1000));
      await receiveSimulatedEvent(raw, ts, simulatedEventSignature(raw, ts));
    }
    expect((await messages(f.businessId))[0].state).toBe("COMPLAINED");
  });
  it("creates verified attribution in the same real booking transaction and reports only historical money", async () => {
    const f = await fixture({ maximum: 1 });
    await runContactWorker({ businessId: f.businessId });
    const value = await tokenFor(f.businessId, "BOOKING"),
      [m] = await messages(f.businessId);
    expect(await bookingDestination(value)).toContain("/widget/");
    const start = f.day(-10),
      result = await createAppointment(
        {
          businessId: f.businessId,
          locationId: f.location.id,
          serviceId: f.service.id,
          clientId: m.enrollment.clientId,
          customerName: "Synthetic booking",
          customerEmail: m.enrollment.client.email,
          customerPhone: "",
          startTime: start,
          endTime: new Date(+start + 3600000),
          contactFlowToken: value,
        },
        { syncGoogle: false },
      );
    expect(result.success).toBe(true);
    if (!result.success) return;
    await prisma.appointment.update({
      where: { id: result.appointment.id },
      data: { status: "COMPLETED", settledAt: new Date() },
    });
    const r = await contactResults(f.scope, f.campaignId!);
    expect(r).toMatchObject({
      reservations: 1,
      completed: 1,
      knownRevenue: 0,
      recordedRevenue: null,
      unknownAmounts: 1,
      incrementality: null,
    });
  });
  it("rejects a forwarded attribution link for another contact and rolls back the booking", async () => {
    const f = await fixture({ maximum: 1 });
    await runContactWorker({ businessId: f.businessId });
    const value = await tokenFor(f.businessId, "BOOKING"),
      [m] = await messages(f.businessId),
      other = f.clients.find((c) => c.id !== m.enrollment.clientId)!,
      start = f.day(-10),
      before = await prisma.appointment.count({
        where: { businessId: f.businessId },
      });
    await expect(
      createAppointment(
        {
          businessId: f.businessId,
          locationId: f.location.id,
          serviceId: f.service.id,
          clientId: other.id,
          customerName: "Other synthetic",
          customerEmail: other.email,
          customerPhone: "",
          startTime: start,
          endTime: new Date(+start + 3600000),
          contactFlowToken: value,
        },
        { syncGoogle: false },
      ),
    ).rejects.toThrow("ATTRIBUTION_NOT_VERIFIABLE");
    expect(
      await prisma.appointment.count({ where: { businessId: f.businessId } }),
    ).toBe(before);
  });
  it("protects immutable versions, consent evidence and terminal campaign transitions in SQL", async () => {
    const f = await fixture({ authorize: false }),
      v = (await contactSnapshot(f.scope)).campaigns[0].version;
    await expect(
      prisma.cfVersion.update({
        where: { id: v.id },
        data: { subject: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.cfConsent.updateMany({
        where: { businessId: f.businessId },
        data: { evidenceHash: "0".repeat(64) },
      }),
    ).rejects.toThrow();
    await controlCampaign(f.scope, f.campaignId!, "CANCEL");
    await expect(
      prisma.cfCampaign.update({
        where: { id: f.campaignId! },
        data: { status: "RUNNING" },
      }),
    ).rejects.toThrow();
  });
  it("enables private RLS on every Contact Flow table and denies public SQL grants", async () => {
    const rows = await prisma.$queryRaw<
      { relname: string; relrowsecurity: boolean }[]
    >`SELECT relname,relrowsecurity FROM pg_class WHERE relname LIKE 'Cf%' AND relkind='r'`;
    expect(rows.length).toBe(18);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
    for (const row of rows) {
      const [grant] = await prisma.$queryRaw<
        { allowed: boolean }[]
      >`SELECT has_table_privilege('anon',${`"${row.relname}"`},'SELECT,INSERT,UPDATE,DELETE') AS allowed`;
      expect(grant.allowed).toBe(false);
    }
  });
  it("retention is bounded, idempotent and preserves revocations and accounting evidence", async () => {
    const f = await fixture({ maximum: 1 });
    await unsubscribe(await tokenFor(f.businessId, "UNSUBSCRIBE"));
    const p = {
      campaignDays: 90,
      outboxDays: 30,
      deliveryDays: 90,
      providerEventDays: 30,
      evidenceDays: 90,
      auditDays: 365,
      consentDays: 3650,
      attributionDays: 3650,
      legalHold: true as const,
    };
    expect(await purgeContactFlow(p, 1)).toMatchObject({
      consents: 0,
      suppressions: 0,
      attribution: 0,
    });
    expect(await purgeContactFlow(p, 1)).toMatchObject({
      consents: 0,
      suppressions: 0,
      attribution: 0,
    });
    expect(
      await prisma.cfSuppression.count({ where: { businessId: f.businessId } }),
    ).toBe(1);
  });
});
