import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/email/send", () => ({ sendWelcomeEmail: vi.fn(async () => true), sendNewRegistrationNotification: vi.fn(async () => true) }));
import { prisma } from "@/server/db/prisma";
import { registerUser } from "@/server/services/auth.service";
import { registerSchema } from "@/server/validations/auth";
import { quoteCommercialContract, COMMERCIAL_CATALOG_VERSION } from "@/core/commercial-catalog";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { changeCommercialTrial, expireCommercialTrial } from "@/server/services/commercial-trial.service";
import { resolveWebsiteCommercialAccess } from "@/server/websites/commercial-access";
import { createGrowthScope } from "@/server/puri/growth/access";
import type { PuriContext } from "@/server/puri/types";
import { withStaffCapacityLock, assertStaffCapacity, getStaffLimitInfo } from "@/server/services/staff-capacity.service";
import { reconcileCommercialEvent, type ReconciledCommercialEvidence } from "@/server/services/commercial-reconciliation.service";
import { reserveGrowthUsage, settleGrowthUsage } from "@/server/puri/growth/budgets";
import { commercialUsagePolicySchema } from "@/server/services/commercial-usage-policy";

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const users: string[] = [], businesses: string[] = [], ips: string[] = [];
async function register(plan: "PURAGENDA" | "PURAGENDA_PLUS" = "PURAGENDA_PLUS", seats = 1, cycle: "MONTHLY" | "ANNUAL" = "MONTHLY", ip = "127.0.0.1", email?: string) {
  const input = registerSchema.parse({ email: email ?? `${randomUUID()}@example.invalid`, password: "Local-test-only-pass123", name: "Synthetic Owner", businessName: `Next ${randomUUID()}`,
    countryCode: "CL", marketplaceCategorySlug: "otro", marketplaceOtherDescription: "Negocio sintético", marketplaceCityName: "Local QA", marketplaceLocalityNotFound: true,
    termsAccepted: true, commercialPlanIntent: plan, professionalTotal: seats, billingCycle: cycle });
  const result = await registerUser({ ...input, ip });
  if (!result.success) throw new Error(result.error);
  users.push(result.user.id); businesses.push(result.business.id);
  return { ...result, input };
}
suite("Next registration and real local trial lifecycle", () => {
  afterEach(() => { delete process.env.COMMERCIAL_USAGE_POLICY_JSON; });
  afterAll(async () => {
    await prisma.blacklistedIp.deleteMany({ where: { ip: { in: ips } } });
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("registers %s with 1/2/5 professionals and both cycles", async plan => {
    for (const seats of [1, 2, 5]) for (const billingCycle of ["MONTHLY", "ANNUAL"] as const) {
      const c = await register(plan, seats, billingCycle), businessId = c.business.id;
      const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId }, include: { items: true, entitlements: true } });
      const quote = quoteCommercialContract({ plan, professionalTotal: seats, billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION });
      expect(sub).toMatchObject({ planCode: plan, professionalTotal: seats, billingCycle, status: "TRIALING", totalPriceClp: quote.cycleTotal, provider: "NONE", lastPaymentAt: null, renewalAt: null });
      expect(sub.trialEnd!.getTime() - sub.trialStart!.getTime()).toBe(30 * 86400000);
      expect(sub.items.reduce((total, row) => total + row.amountClp!, 0)).toBe(quote.cycleTotal);
      expect(sub.termsSnapshot).toMatchObject({ vatIncluded: true, annualFreeMonths: billingCycle === "ANNUAL" ? 2 : 0 });
      expect(await prisma.subscription.findUnique({ where: { businessId } })).toMatchObject({ plan, isTrial: true, staffLimitOverride: seats, billingCycle });
      const access = await getCommercialPlanAccess(businessId);
      expect(access.professionalTotal).toBe(seats); expect(access.has("agenda.operations")).toBe(true);
      expect(access.has("puri.plus")).toBe(plan === "PURAGENDA_PLUS"); expect(access.has("contact_flow")).toBe(plan === "PURAGENDA_PLUS");
      expect((await resolveWebsiteCommercialAccess(businessId)).publish).toBe(plan === "PURAGENDA_PLUS");
      const scope = createGrowthScope({ user: { id: c.user.id }, business: { id: businessId }, location: null } as PuriContext);
      if (plan === "PURAGENDA_PLUS") expect((await scope).businessId).toBe(businessId);
      else await expect(scope).rejects.toThrow("PLUS_ENTITLEMENT_REQUIRED");
    }
  }, 30000);
  it("rejects forged plan/capacity input instead of trusting client prices", () => {
    const base = { email: "local@example.invalid", password: "Local-only123", name: "QA", businessName: "QA", countryCode: "CL", termsAccepted: true, marketplaceCategorySlug: "otro", marketplaceOtherDescription: "Local test", marketplaceLocalityNotFound: true, marketplaceCityName: "Local" };
    for (const professionalTotal of [0, -1, 1.5, 21, "5"]) expect(registerSchema.safeParse({ ...base, professionalTotal }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, commercialPlanIntent: "EQUIPO" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, planIntent: "TEST" }).success).toBe(false);
    expect(registerSchema.parse({ ...base, amount: 1, trialEnd: "2099-01-01" })).not.toHaveProperty("amount");
  });
  it("changes plan/cycle/capacity without extending trial and deduplicates retries", async () => {
    const c = await register(), businessId = c.business.id;
    const before = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    const change = { businessId, actorId: c.user.id, plan: "PURAGENDA" as const, professionalTotal: 2, billingCycle: "ANNUAL" as const, idempotencyKey: randomUUID() };
    expect(await changeCommercialTrial(change)).toEqual({ duplicate: false });
    expect(await changeCommercialTrial(change)).toEqual({ duplicate: true });
    await expect(changeCommercialTrial({ ...change, professionalTotal: 5 })).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    const after = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    expect(after.trialEnd).toEqual(before.trialEnd); expect(after.trialStart).toEqual(before.trialStart);
    expect(after.totalPriceClp).toBe(179900); expect((await getCommercialPlanAccess(businessId)).has("puri.plus")).toBe(false);
    await changeCommercialTrial({ ...change, plan: "PURAGENDA_PLUS", idempotencyKey: randomUUID() });
    expect((await getCommercialPlanAccess(businessId)).has("puri.plus")).toBe(true);
    await expect(changeCommercialTrial({ ...change, actorId: randomUUID() })).rejects.toThrow("OWNER_REQUIRED");
  });
  it("serializes professional creation and refuses reductions below active staff", async () => {
    const c = await register("PURAGENDA_PLUS", 2), businessId = c.business.id;
    const create = () => withStaffCapacityLock(businessId, async tx => { await assertStaffCapacity(businessId, tx); return tx.staff.create({ data: { businessId, name: "Synthetic Staff" } }); });
    const results = await Promise.allSettled([create(), create()]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await getStaffLimitInfo(businessId)).currentCount).toBe(2);
    await expect(changeCommercialTrial({ businessId, actorId: c.user.id, plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "MONTHLY", idempotencyKey: randomUUID() })).rejects.toThrow("ACTIVE_PROFESSIONALS_EXCEED_SELECTION");
  });
  it("denies exactly at expiry, expires idempotently and retains the website and settings", async () => {
    const c = await register(), businessId = c.business.id;
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    await prisma.businessWebsite.create({ data: { businessId, subdomain: `qa-${randomUUID()}`, draftConfig: { retained: true }, publishedConfig: { retained: true }, publishedAt: new Date(), status: "PUBLISHED" } });
    expect((await getCommercialPlanAccess(businessId, sub.trialEnd!)).allowed).toBe(false);
    expect((await resolveWebsiteCommercialAccess(businessId, sub.trialEnd!)).hosting).toBe(false);
    expect(await expireCommercialTrial(businessId, sub.trialEnd!)).toBe(true);
    expect(await expireCommercialTrial(businessId, sub.trialEnd!)).toBe(false);
    expect(await prisma.businessWebsite.findUnique({ where: { businessId } })).toMatchObject({ draftConfig: { retained: true }, publishedConfig: { retained: true } });
    expect(await prisma.staff.count({ where: { businessId } })).toBe(1);
    await expect(changeCommercialTrial({ businessId, actorId: c.user.id, plan: "PURAGENDA_PLUS", professionalTotal: 2, billingCycle: "MONTHLY", idempotencyKey: randomUUID() }, sub.trialEnd!)).rejects.toThrow("ACTIVE_TRIAL_REQUIRED");
  });
  it("serializes same-IP trial claims; repeating registration never extends a trial", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`; ips.push(ip);
    const pair = await Promise.all([register("PURAGENDA", 1, "MONTHLY", ip), register("PURAGENDA_PLUS", 1, "MONTHLY", ip)]);
    const subs = await prisma.commercialSubscription.findMany({ where: { businessId: { in: pair.map(p => p.business.id) } } });
    expect(subs.filter(s => s.status === "TRIALING")).toHaveLength(1); expect(subs.filter(s => s.status === "INACTIVE")).toHaveLength(1);
    const duplicate = await registerUser({ ...pair[0].input, ip }); expect(duplicate.success).toBe(false);
    expect(await prisma.commercialSubscription.count({ where: { businessId: pair[0].business.id } })).toBe(1);
  });
  it("renews/reactivates only with verified fixture payment evidence; retries preserve the paid period", async () => {
    const c = await register("PURAGENDA_PLUS", 5, "ANNUAL"), businessId = c.business.id;
    let sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    const now = new Date(), end = new Date(+now + 365 * 86400000), reference = `fixture-${randomUUID()}`;
    await prisma.commercialSubscription.update({ where: { id: sub.id }, data: { provider: "MERCADO_PAGO", externalSubscriptionId: reference, status: "ACTIVE" } });
    expect((await getCommercialPlanAccess(businessId)).allowed).toBe(false);
    const evidence: ReconciledCommercialEvidence = { businessId, subscriptionId: sub.id, provider: "MERCADO_PAGO", reference, eventId: randomUUID(), kind: "PAYMENT_CONFIRMED", amountClp: sub.totalPriceClp!, currencyCode: "CLP", occurredAt: now, periodStart: now, periodEnd: end };
    const verifyAndFetch = async () => evidence;
    expect((await reconcileCommercialEvent({}, { verifyAndFetch })).outcome).toBe("APPLIED");
    expect((await reconcileCommercialEvent({}, { verifyAndFetch })).duplicate).toBe(true);
    expect((await getCommercialPlanAccess(businessId)).has("contact_flow")).toBe(true);
    expect(await prisma.subscription.findUnique({ where: { businessId } })).toMatchObject({ status: "ACTIVE", isTrial: false, currentPeriodEnd: end });
    expect(await expireCommercialTrial(businessId, sub.trialEnd!)).toBe(false);
    expect((await getCommercialPlanAccess(businessId, end)).allowed).toBe(false);
    sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    expect(sub.lastPaymentEventId).toBeTruthy(); expect(sub.trialEnd).not.toEqual(end);
  });
  it("does not migrate or reprice an existing legacy contract", async () => {
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: "synthetic-no-login", name: "Legacy fixture" } });
    const businessId = `legacy-${randomUUID()}`;
    users.push(user.id); businesses.push(businessId);
    await prisma.business.create({ data: { id: businessId, slug: businessId, apiKey: randomUUID(), name: "Legacy fixture", ownerId: user.id } });
    await prisma.subscription.create({ data: { businessId, plan: "EQUIPO", status: "ACTIVE", isTrial: false, extraStaffCount: 2, staffLimitOverride: null, customMonthlyPriceClp: 24000, paymentMethod: "BANK_TRANSFER", billingCycle: "MONTHLY" } });
    const before = await prisma.subscription.findUnique({ where: { businessId } });
    expect((await getCommercialPlanAccess(businessId)).professionalTotal).toBe(7);
    expect((await getCommercialPlanAccess(businessId)).has("puri.plus")).toBe(false);
    expect(await prisma.subscription.findUnique({ where: { businessId } })).toEqual(before);
  });
  it("requires explicit allowances and never replenishes a trial at month boundaries or on retry", async () => {
    const c = await register(), businessId = c.business.id;
    await expect(reserveGrowthUsage({ businessId, category: "ANALYSIS_SQL", key: randomUUID(), inputHash: "test", micros: 0 })).rejects.toThrow("COMMERCIAL_USAGE_LIMITS_UNDEFINED");
    // Synthetic test quotas only, not commercial defaults.
    const budget = { limitUnits: 1, limitMicros: 100 };
    process.env.COMMERCIAL_USAGE_POLICY_JSON = JSON.stringify(commercialUsagePolicySchema.parse({ version: "synthetic-test", trial: { PURAGENDA_PLUS: { puri: { ALL: budget, ANALYSIS_SQL: budget } } }, paid: {}, global: { puri: { limitUnits: 1_000_000_000, limitMicros: 1_000_000_000 } } }));
    const request = { businessId, category: "ANALYSIS_SQL" as const, key: randomUUID(), inputHash: "test", micros: 0 };
    const first = await reserveGrowthUsage(request); expect((await reserveGrowthUsage(request)).duplicate).toBe(true);
    await settleGrowthUsage(first.reservation.id, { actualMicros: 0 });
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    const later = new Date(+sub.trialStart! + 20 * 86400000);
    await expect(reserveGrowthUsage({ ...request, key: randomUUID(), now: later })).rejects.toThrow("BUDGET_EXHAUSTED");
  });
});
