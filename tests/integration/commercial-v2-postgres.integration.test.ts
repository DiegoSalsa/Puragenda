import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createCommercialSubscriptionSnapshot, materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import { requestCommercialSeatChange, applyCommercialSeatChange, createCommercialStaff, reactivateCommercialStaff, getCommercialCapacityInfo, cancelCommercialSeatChange } from "@/server/services/commercial-capacity.service";
import { reconcileCommercialEvent, type ReconciledCommercialEvidence } from "@/server/services/commercial-reconciliation.service";
import { getCommercialEntitlementShadow } from "@/server/services/commercial-entitlements.service";
import { backfillLegacySubscription, backfillLegacyBatch } from "@/server/services/commercial-backfill.service";
import { getCommercialDiagnostics } from "@/server/services/commercial-observability.service";

const databaseUrl = process.env.COMMERCIAL_V2_TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const stamp = () => new Date();
const before = (ms = 60_000) => new Date(Date.now() - ms);
const after = (ms = 86_400_000 * 30) => new Date(Date.now() + ms);
const pool = new pg.Pool({ connectionString: databaseUrl });
const fixtureIds: string[] = [];
async function business() {
  const id = `commercial-${randomUUID()}`;
  fixtureIds.push(id);
  await prisma.business.create({ data: { id, name: "Anonymous fixture", slug: id, apiKey: randomUUID() } });
  return id;
}
async function contract(seats = 1, plan: "PURAGENDA" | "PURAGENDA_PLUS" = "PURAGENDA") {
  const businessId = await business();
  const result = await createCommercialSubscriptionSnapshot({ businessId, plan, professionalTotal: seats,
    billingCycle: "MONTHLY", status: "PENDING_PAYMENT", provider: "MERCADO_PAGO", externalSubscriptionId: `fixture-${businessId}`,
    effectiveFrom: before(120_000), periodStart: before(120_000), periodEnd: after(), renewalAt: after() });
  const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
  await evidence({ businessId, subscriptionId: result.snapshotId, provider: "MERCADO_PAGO", reference: snapshot.externalSubscriptionId!,
    eventId: randomUUID(), kind: "PAYMENT_CONFIRMED", amountClp: snapshot.totalPriceClp!, currencyCode: "CLP", occurredAt: before(90_000),
    periodStart: before(120_000), periodEnd: snapshot.periodEnd! });
  return { businessId, subscriptionId: result.snapshotId };
}
async function evidence(value: ReconciledCommercialEvidence) {
  // Explicit fixture verifier only; no simulated payment enters a real tenant.
  return reconcileCommercialEvent({}, { verifyAndFetch: async () => value });
}
async function request(c: Awaited<ReturnType<typeof contract>>, seats: number, key = randomUUID()) {
  const now = before(15_000);
  return requestCommercialSeatChange({ ...c, requestedProfessionalTotal: seats, idempotencyKey: key, effectiveAt: before(10_000) }, now);
}
async function changeEvidence(c: Awaited<ReturnType<typeof contract>>, r: Awaited<ReturnType<typeof request>>, overrides: Partial<ReconciledCommercialEvidence> = {}) {
  const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: c.businessId } });
  return evidence({ ...c, eventId: randomUUID(), requestId: r.id, provider: "MERCADO_PAGO", reference: snapshot.externalSubscriptionId!,
    kind: "PAYMENT_CONFIRMED", amountClp: r.quotedAmountClp, currencyCode: "CLP", occurredAt: before(5_000),
    periodStart: before(10_000), periodEnd: after(), ...overrides });
}

suite("commercial V2 actual PostgreSQL services, locks and constraints", () => {
  beforeAll(() => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) || !/^\/puragenda_commercial_test(?:_[a-z0-9]+)?$/.test(url.pathname)) throw new Error("Unsafe test database");
  });
  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: fixtureIds } } });
    await prisma.$disconnect();
    await pool.end();
  });

  it.each([1, 2, 5, 6, 8, 100])("persists exact tiers and activates %i seats only after reconciliation", async total => {
    const c = await contract(total);
    const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: c.businessId }, include: { items: true } });
    const base = snapshot.items.find(row => row.kind === "BASE_PLAN")!;
    const seats = snapshot.items.find(row => row.kind === "PROFESSIONAL_SEATS")!;
    const breakdown = seats.pricingSnapshot as { surchargeSteps: { quantity: number; unitAmount: number; subtotal: number }[] };
    expect(breakdown.surchargeSteps.reduce((sum, step) => sum + step.quantity * step.unitAmount, 0)).toBe(seats.amountClp);
    expect(base.amountClp! + seats.amountClp!).toBe(snapshot.totalPriceClp);
    expect(seats.unitAmountClp).toBeNull();
    const shadow = await getCommercialEntitlementShadow(c.businessId);
    expect(shadow.quantities["professional.seats"]).toBe(total);
    expect(shadow.capabilities).not.toContain("puri.plus");
  });

  it("pending purchase cannot activate capacity or staff", async () => {
    const c = await contract();
    const r = await request(c, 2);
    await expect(applyCommercialSeatChange(c.businessId, r.id, "unverified-event")).rejects.toThrow("RECONCILED_EVIDENCE_REQUIRED");
    expect((await getCommercialCapacityInfo(c.businessId)).contractedProfessionalTotal).toBe(1);
  });

  it("serializes two simultaneous increases and retains one open request", async () => {
    const c = await contract();
    const results = await Promise.allSettled([request(c, 2), request(c, 5)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(await prisma.seatChangeRequest.count({ where: { businessId: c.businessId } })).toBe(1);
  });

  it("retries the same request and applies the same change concurrently exactly once", async () => {
    const c = await contract();
    const key = randomUUID();
    const now = before(15_000); const effectiveAt = before(10_000);
    const input = { businessId: c.businessId, requestedProfessionalTotal: 2, idempotencyKey: key, effectiveAt };
    const pair = await Promise.all([requestCommercialSeatChange(input, now), requestCommercialSeatChange(input, now)]);
    expect(pair[0].id).toBe(pair[1].id);
    // A retry after its requested effective date must still return the same row.
    expect((await requestCommercialSeatChange(input, stamp())).id).toBe(pair[0].id);
    const e = await changeEvidence(c, pair[0]);
    const results = await Promise.all([applyCommercialSeatChange(c.businessId, pair[0].id, e.eventId), applyCommercialSeatChange(c.businessId, pair[0].id, e.eventId)]);
    expect(results.filter(row => row.applied)).toHaveLength(1);
    expect(results.filter(row => row.alreadyApplied)).toHaveLength(1);
    // Simulate the caller timing out after a committed result, then retrying.
    expect((await applyCommercialSeatChange(c.businessId, pair[0].id, e.eventId)).alreadyApplied).toBe(true);
    expect(await prisma.commercialEvent.count({ where: { source: "seat_change_application", eventId: pair[0].id } })).toBe(1);
    const items = await prisma.commercialSubscriptionItem.findMany({ where: { subscriptionId: c.subscriptionId, kind: "PROFESSIONAL_SEATS" } });
    expect(items).toHaveLength(2);
    expect(items.filter(row => !row.effectiveTo)).toHaveLength(1);
  });

  it("serializes two staff creations and preserves inactive history", async () => {
    const c = await contract();
    await prisma.staff.create({ data: { name: "Historical", businessId: c.businessId, isActive: false } });
    const results = await Promise.allSettled([createCommercialStaff(c.businessId, { name: "A" }, randomUUID()), createCommercialStaff(c.businessId, { name: "B" }, randomUUID())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.staff.count({ where: { businessId: c.businessId, isActive: true } })).toBe(1);
    expect((await getCommercialCapacityInfo(c.businessId)).historicalProfessionalTotal).toBe(1);
    const old = await prisma.staff.findFirstOrThrow({ where: { businessId: c.businessId, isActive: false } });
    await expect(reactivateCommercialStaff(c.businessId, old.id)).rejects.toThrow("CAPACITY_EXCEEDED");
  });

  it("counts one professional across two locations and rejects cross-tenant locations", async () => {
    const c = await contract(2); const other = await contract();
    const l1 = await prisma.businessLocation.create({ data: { businessId: c.businessId, name: "North", slug: "north", timezone: "America/Santiago" } });
    const l2 = await prisma.businessLocation.create({ data: { businessId: c.businessId, name: "South", slug: "south", timezone: "America/Santiago" } });
    const foreign = await prisma.businessLocation.create({ data: { businessId: other.businessId, name: "Other", slug: "other", timezone: "America/Santiago" } });
    const staff = await createCommercialStaff(c.businessId, { name: "Shared", locationIds: [l1.id, l2.id] }, randomUUID());
    expect((await getCommercialCapacityInfo(c.businessId)).activeProfessionalTotal).toBe(1);
    expect(await prisma.staffLocation.count({ where: { staffId: staff.id } })).toBe(2);
    await expect(createCommercialStaff(c.businessId, { name: "Bad", locationIds: [foreign.id] }, randomUUID())).rejects.toThrow("LOCATION_TENANT_MISMATCH");
    await expect(reactivateCommercialStaff(other.businessId, staff.id)).rejects.toThrow();
  });

  it("persists reduction conflict, leaves staff intact and applies after explicit resolution", async () => {
    const c = await contract(2);
    const renewal = new Date(Date.now() + 10_000);
    await prisma.commercialSubscription.update({ where: { id: c.subscriptionId }, data: { renewalAt: renewal } });
    const staff = await prisma.staff.createManyAndReturn({ data: [{ name: "A", businessId: c.businessId }, { name: "B", businessId: c.businessId }] });
    const r = await requestCommercialSeatChange({ businessId: c.businessId, requestedProfessionalTotal: 1, idempotencyKey: randomUUID(), effectiveAt: renewal });
    expect(r.conflictReason).toBe("ACTIVE_STAFF_CONFLICT");
    expect((await applyCommercialSeatChange(c.businessId, r.id, "missing")).pending).toBe(true);
    const e = await changeEvidence(c, r, { kind: "CONTRACT_CONFIRMED", occurredAt: stamp(), periodStart: renewal, periodEnd: after() });
    const applicationTime = new Date(renewal.getTime() + 1);
    expect((await applyCommercialSeatChange(c.businessId, r.id, e.eventId, applicationTime)).blockedByActiveStaff).toBe(true);
    await prisma.staff.update({ where: { id: staff[1].id }, data: { isActive: false } });
    expect((await applyCommercialSeatChange(c.businessId, r.id, e.eventId, applicationTime)).applied).toBe(true);
    expect(await prisma.staff.count({ where: { businessId: c.businessId } })).toBe(2);
  });

  it("deduplicates canonical events and ignores out-of-order events", async () => {
    const c = await contract(); const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: c.subscriptionId } });
    const event: ReconciledCommercialEvidence = { ...c, provider: "MERCADO_PAGO", eventId: randomUUID(), reference: snapshot.externalSubscriptionId!,
      kind: "PAYMENT_CONFIRMED", amountClp: snapshot.totalPriceClp!, currencyCode: "CLP", occurredAt: before(1000), periodStart: before(), periodEnd: after() };
    const pair = await Promise.all([evidence(event), evidence(event)]);
    expect(pair.filter(row => row.duplicate)).toHaveLength(1);
    expect((await evidence({ ...event, eventId: randomUUID(), occurredAt: before(2000), kind: "PAST_DUE" })).outcome).toBe("IGNORED");
    expect((await evidence({ ...event, eventId: randomUUID(), kind: "CANCELLED" })).outcome).toBe("UNKNOWN");
    expect((await getCommercialEntitlementShadow(c.businessId)).commercialAccess).toBe(true);
    await expect(evidence({ ...event, amountClp: 1 })).rejects.toThrow("EVENT_IDEMPOTENCY_CONFLICT");
  });

  it("rejects forged amounts, references, tenants and unauthenticated evidence", async () => {
    const c = await contract(); const other = await contract(); const r = await request(c, 2);
    expect((await changeEvidence(c, r, { amountClp: 1 })).outcome).toBe("REJECTED");
    expect(await changeEvidence(c, r, { reference: "wrong" })).toMatchObject({ outcome: "REJECTED", rejectionCode: "PROVIDER_REFERENCE_MISMATCH" });
    expect((await changeEvidence(other, r)).outcome).toBe("REJECTED");
    await expect(reconcileCommercialEvent({}, { verifyAndFetch: async () => { throw new Error("INVALID_SIGNATURE"); } })).rejects.toThrow("INVALID_SIGNATURE");
    await expect(applyCommercialSeatChange(other.businessId, r.id, "fake")).rejects.toThrow("REQUEST_NOT_FOUND");
    await expect(prisma.commercialEntitlement.create({ data: { businessId: other.businessId, subscriptionId: c.subscriptionId, capability: "puri.plus",
      source: "forged", dedupeKey: randomUUID(), validFrom: stamp() } })).rejects.toThrow();
  });

  it("expires entitlements and revokes old materialized capabilities", async () => {
    const c = await contract(1, "PURAGENDA_PLUS");
    expect((await getCommercialEntitlementShadow(c.businessId)).capabilities).toContain("puri.plus");
    const updated = await prisma.commercialSubscription.update({ where: { id: c.subscriptionId }, data: { status: "CANCELLED" } });
    await prisma.$transaction(tx => materializeCommercialEntitlements(tx, updated));
    expect((await getCommercialEntitlementShadow(c.businessId)).capabilities).toEqual([]);
    expect(await prisma.commercialEntitlement.count({ where: { subscriptionId: c.subscriptionId, status: "ACTIVE" } })).toBe(0);
    expect((await getCommercialDiagnostics(c.businessId)).mismatches).toEqual([]);
  });

  it("blocks stale quotes and leaves capacity unchanged", async () => {
    const c = await contract(); const r = await request(c, 2); const e = await changeEvidence(c, r);
    await prisma.seatChangeRequest.update({ where: { id: r.id }, data: { quoteSnapshot: { monthlyTotal: 1 } } });
    await expect(applyCommercialSeatChange(c.businessId, r.id, e.eventId)).rejects.toThrow("QUOTE_CHANGED_REQUIRES_REVIEW");
    expect((await getCommercialCapacityInfo(c.businessId)).contractedProfessionalTotal).toBe(1);
  });

  it.each(["INDIVIDUAL", "EQUIPO", "TEST"] as const)("backfills %s idempotently without modifying its legacy contract", async plan => {
    const businessId = await business();
    const legacy = await prisma.subscription.create({ data: { businessId, plan, status: "ACTIVE", currentPeriodEnd: after(),
      pendingDiscountPercentage: 25, freeMonthsRemaining: 2, promoFreeMonthsRemaining: 1, promoName: "Anonymous reward" } });
    await prisma.websiteAddon.create({ data: { businessId, status: "ACTIVE", validUntil: after(), provider: "mercadopago" } });
    const first = await backfillLegacySubscription(businessId, true);
    const second = await backfillLegacySubscription(businessId, true);
    expect(first.alreadyBackfilled).toBe(false); expect(second.alreadyBackfilled).toBe(true);
    expect(first.snapshotInput.totalPriceClp).toBeNull();
    expect(first.snapshotInput.legacyAddon?.amountClp).toBeNull();
    const current = await prisma.subscription.findUnique({ where: { id: legacy.id } });
    expect(current).toEqual(legacy);
    expect(await prisma.commercialSubscription.count({ where: { businessId } })).toBe(1);
    const shadow = await getCommercialEntitlementShadow(businessId);
    expect(shadow.capabilities).toContain("website.hosting");
    expect(shadow.capabilities).not.toContain("puri.plus");
    await prisma.subscription.update({ where: { id: legacy.id }, data: { extraStaffCount: 1 } });
    expect((await backfillLegacySubscription(businessId, true)).warnings).toContain("LEGACY_SOURCE_DRIFT_REQUIRES_REVIEW");
  });

  it("preserves expired, trial, free-month, manual price and incomplete legacy terms", async () => {
    const businessId = await business();
    await prisma.subscription.create({ data: { businessId, plan: "INDIVIDUAL", status: "TRIALING", isTrial: true,
      trialEndsAt: after(), paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 9990, staffLimitOverride: 3, freeMonthsRemaining: 2 } });
    const report = await backfillLegacySubscription(businessId, true);
    expect(report.snapshotInput.professionalTotal).toBe(3);
    expect(report.snapshotInput.termsSnapshot).toMatchObject({ customMonthlyPriceClp: 9990, freeMonthsRemaining: 2 });
    expect(report.commercialAccess).toBe(true);
    const bad = await business();
    await prisma.subscription.create({ data: { businessId: bad, plan: "EQUIPO", status: "PAST_DUE" } });
    expect((await backfillLegacySubscription(bad, true)).commercialAccess).toBe(false);
  });


  it("reconciles an UNKNOWN request later, without enabling pending seats", async () => {
    const c = await contract(); const r = await request(c, 2);
    const unknown = await changeEvidence(c, r, { kind: "PAYMENT_PENDING" });
    expect(unknown.outcome).toBe("UNKNOWN");
    expect((await prisma.seatChangeRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("UNKNOWN");
    expect((await getCommercialCapacityInfo(c.businessId)).contractedProfessionalTotal).toBe(1);
    const paid = await changeEvidence(c, r, { occurredAt: stamp() });
    expect((await applyCommercialSeatChange(c.businessId, r.id, paid.eventId)).applied).toBe(true);
  });

  it("cancels an unpaid request idempotently, while paid changes require reconciliation", async () => {
    const c = await contract(); const r = await request(c, 2);
    expect((await cancelCommercialSeatChange(c.businessId, r.id)).cancelled).toBe(true);
    expect((await cancelCommercialSeatChange(c.businessId, r.id)).alreadyCancelled).toBe(true);
    const second = await request(c, 2); await changeEvidence(c, second);
    await expect(cancelCommercialSeatChange(c.businessId, second.id)).rejects.toThrow("RECONCILIATION_REQUIRED_BEFORE_CANCELLATION");
  });

  it("persists a stale request rejection rather than rolling it back on an exception", async () => {
    const c = await contract(); const r = await request(c, 2);
    await prisma.commercialSubscription.update({ where: { id: c.subscriptionId }, data: { professionalTotal: 3 } });
    expect((await applyCommercialSeatChange(c.businessId, r.id, "missing")).rejected).toBe(true);
    expect((await prisma.seatChangeRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("REJECTED");
  });

  it("detects legacy source drift in shadow and supports resumable batches", async () => {
    const businessId = await business();
    const legacy = await prisma.subscription.create({ data: { businessId, plan: "EQUIPO", currentPeriodEnd: after() } });
    await backfillLegacySubscription(businessId, true);
    await prisma.subscription.update({ where: { id: legacy.id }, data: { freeMonthsRemaining: 1 } });
    expect((await getCommercialEntitlementShadow(businessId)).reason).toBe("LEGACY_SOURCE_DRIFT_REQUIRES_REVIEW");
    const batch = await backfillLegacyBatch({ limit: 1 });
    expect(batch.reports).toHaveLength(1);
    const next = await backfillLegacyBatch({ limit: 1, afterBusinessId: batch.nextCursor! });
    expect(next.reports[0]?.businessId).not.toBe(batch.reports[0].businessId);
  });

  it("database constraints reject duplicate open requests outside the service", async () => {
    const c = await contract(); const r = await request(c, 2);
    await expect(prisma.seatChangeRequest.create({ data: { businessId: c.businessId, subscriptionId: c.subscriptionId,
      kind: "INCREASE", previousProfessionalTotal: 1, requestedProfessionalTotal: 3, activeProfessionalsAtRequest: 0,
      quotedAmountClp: 22490, currencyCode: "CLP", catalogVersion: r.catalogVersion, effectiveAt: stamp(),
      idempotencyKey: randomUUID(), status: "PENDING_PAYMENT", quoteSnapshot: {} } })).rejects.toThrow();
  });


  it("reconciles past_due, recovery and cancellation without stale entitlements", async () => {
    const c = await contract(); const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: c.subscriptionId } });
    const base: ReconciledCommercialEvidence = { ...c, provider: "MERCADO_PAGO", eventId: randomUUID(), reference: snapshot.externalSubscriptionId!,
      kind: "PAST_DUE", amountClp: snapshot.totalPriceClp!, currencyCode: "CLP", occurredAt: before(6000), periodStart: before(), periodEnd: after() };
    await evidence(base);
    expect((await getCommercialEntitlementShadow(c.businessId)).commercialAccess).toBe(false);
    await expect(createCommercialStaff(c.businessId, { name: "Blocked" }, randomUUID())).rejects.toThrow("CAPACITY_EXCEEDED");
    await evidence({ ...base, eventId: randomUUID(), occurredAt: before(4000), kind: "PAYMENT_CONFIRMED" });
    expect((await getCommercialEntitlementShadow(c.businessId)).commercialAccess).toBe(true);
    await evidence({ ...base, eventId: randomUUID(), occurredAt: before(2000), kind: "CANCELLED" });
    expect((await getCommercialEntitlementShadow(c.businessId)).commercialAccess).toBe(false);
    expect(await prisma.commercialEntitlement.count({ where: { subscriptionId: c.subscriptionId, status: "ACTIVE" } })).toBe(0);
  });

  it("enforces RLS and revokes Supabase client-role grants on all new tables", async () => {
    const tables = ["CommercialSubscription", "CommercialSubscriptionItem", "CommercialEntitlement", "CommercialEvent", "SeatChangeRequest"];
    const result = await pool.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY($1::text[])`, [tables]);
    expect(result.rows).toHaveLength(5);
    expect(result.rows.every(row => row.relrowsecurity)).toBe(true);
    for (const role of ["anon", "authenticated"]) for (const table of tables) {
      const rights = await pool.query('SELECT has_table_privilege($1, $2, $3) AS allowed', [role, `"${table}"`, "SELECT,INSERT,UPDATE,DELETE"]);
      expect(rights.rows[0].allowed).toBe(false);
    }
  });
});
