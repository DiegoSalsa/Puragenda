import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
const actionActor = vi.hoisted(() => ({ user: null as { id: string; role: string } | null }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: vi.fn(async () => actionActor.user) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/email/send", () => ({ sendWelcomeEmail: vi.fn(async () => true), sendNewRegistrationNotification: vi.fn(async () => true) }));
import { prisma } from "@/server/db/prisma";
import { registerUser, verifyCredentials } from "@/server/services/auth.service";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { getBusinessForUser } from "@/server/services/business.service";
import { registerSchema } from "@/server/validations/auth";
import { quoteCommercialContract, COMMERCIAL_CATALOG_VERSION } from "@/core/commercial-catalog";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { changeCommercialTrial, createRegistrationContract, expireCommercialTrial } from "@/server/services/commercial-trial.service";
import { resolveWebsiteCommercialAccess } from "@/server/websites/commercial-access";
import { createGrowthScope } from "@/server/puri/growth/access";
import type { PuriContext } from "@/server/puri/types";
import { withStaffCapacityLock, assertStaffCapacity, getStaffLimitInfo } from "@/server/services/staff-capacity.service";
import { reconcileCommercialEvent, type ReconciledCommercialEvidence } from "@/server/services/commercial-reconciliation.service";
import { reserveGrowthUsage, settleGrowthUsage } from "@/server/puri/growth/budgets";
import { commercialUsagePolicySchema } from "@/server/services/commercial-usage-policy";
import { getCommercialUsageSummary } from "@/server/services/commercial-usage-summary";
import { updateBusinessCountryAction } from "@/server/actions/dashboard.actions";
import { revalidatePath } from "next/cache";

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const users: string[] = [], businesses: string[] = [], ips: string[] = [];
let requestNumber = 0;
const registrationBody = () => ({ email: `${randomUUID()}@example.invalid`, password: "Local-test-only-pass123", name: "Synthetic Owner", businessName: `Next ${randomUUID()}`,
  countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago", marketplaceCategorySlug: "otro", marketplaceOtherDescription: "Negocio sintético", marketplaceCityName: "Local QA", marketplaceLocalityNotFound: true, termsAccepted: true });
function request(route: string, body: object) {
  const ip = `203.0.113.${++requestNumber}`; ips.push(ip);
  return new NextRequest(`http://localhost${route}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip, "x-vercel-ip-country": "JP" }, body: JSON.stringify(body) });
}
async function identityCounts() {
  return Promise.all([prisma.user.count(), prisma.business.count(), prisma.subscription.count(), prisma.commercialSubscription.count(), prisma.commercialSubscriptionItem.count(), prisma.staff.count(), prisma.businessLocation.count(), prisma.commercialEvent.count()]);
}
async function regionalState(businessId: string) {
  return Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.subscription.findUnique({ where: { businessId } }),
    prisma.commercialSubscription.findUnique({ where: { businessId }, include: { items: true, entitlements: true } }),
    prisma.commercialBillingOperation.findMany({ where: { businessId } }),
    prisma.commercialEvent.findMany({ where: { businessId }, orderBy: { id: "asc" } }),
    prisma.businessLocation.findMany({ where: { businessId }, include: { hours: true } }),
  ]);
}
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
  afterEach(() => { delete process.env.COMMERCIAL_USAGE_POLICY_JSON; actionActor.user = null; });
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
      expect(sub.currencyCode).toBe("CLP");
      expect(await prisma.business.findUnique({ where: { id: businessId } })).toMatchObject({ countryCode: "CL", currencyCode: "CLP" });
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
  it.each([
    ["PURAGENDA", "MONTHLY", 1, 12990], ["PURAGENDA", "ANNUAL", 1, 129900],
    ["PURAGENDA_PLUS", "MONTHLY", 3, 37490], ["PURAGENDA_PLUS", "ANNUAL", 3, 374900],
  ] as const)("registers Chilean %s / %s through the API without payment or geographic IP restrictions", async (plan, cycle, seats, price) => {
    const response = await registerPOST(request("/api/auth/register", { ...registrationBody(), commercialPlanIntent: plan, professionalTotal: seats, billingCycle: cycle, amount: 1 }));
    expect(response.status).toBe(201);
    const body = await response.json(); users.push(body.user.id); businesses.push(body.business.id);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: body.business.id }, include: { items: true } });
    expect(sub).toMatchObject({ planCode: plan, billingCycle: cycle, professionalTotal: seats, totalPriceClp: price, currencyCode: "CLP", provider: "NONE", externalSubscriptionId: null, lastPaymentAt: null, status: "TRIALING" });
    expect(sub.trialEnd!.getTime() - sub.trialStart!.getTime()).toBe(30 * 86400000);
    expect(sub.items.every(item => item.currencyCode === "CLP")).toBe(true);
    expect(await prisma.commercialBillingOperation.count({ where: { businessId: body.business.id } })).toBe(0);
  });
  it.each([
    { countryCode: "AR", currencyCode: "ARS" }, { countryCode: "US", currencyCode: "CLP" },
    { countryCode: "CL", currencyCode: "USD" }, { countryCode: "CL", currencyCode: "EUR" },
    { countryCode: "CL", currencyCode: "CLP", timezone: "Asia/Tokyo" },
  ])("rejects forged regional fields before creating any identity or contract: %j", async fields => {
    const body = { ...registrationBody(), ...fields }, before = await identityCounts();
    const response = await registerPOST(request("/api/auth/register", body));
    expect(response.status).toBe(400); expect(response.headers.get("set-cookie")).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: body.email } })).toBeNull();
    expect(await identityCounts()).toEqual(before);
    // Internal callers cannot bypass the same policy by skipping the route schema.
    expect(await registerUser(body)).toMatchObject({ success: false, status: 400 });
    expect(await identityCounts()).toEqual(before);
  });
  it("rejects forged plan/capacity input instead of trusting client prices", () => {
    const base = { email: "local@example.invalid", password: "Local-only123", name: "QA", businessName: "QA", countryCode: "CL", termsAccepted: true, marketplaceCategorySlug: "otro", marketplaceOtherDescription: "Local test", marketplaceLocalityNotFound: true, marketplaceCityName: "Local" };
    for (const professionalTotal of [0, -1, 1.5, 21, "5"]) expect(registerSchema.safeParse({ ...base, professionalTotal }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, commercialPlanIntent: "EQUIPO" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, planIntent: "TEST" }).success).toBe(false);
    expect(registerSchema.parse({ ...base, amount: 1, trialEnd: "2099-01-01" })).not.toHaveProperty("amount");
  });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("protects %s regional settings through direct Server Action calls even after trial expiry", async plan => {
    const c = await register(plan), businessId = c.business.id;
    actionActor.user = c.user;
    const unconnected = await regionalState(businessId);
    for (const fields of [{ countryCode: "AR" }, { currencyCode: "USD" }]) {
      expect((await updateBusinessCountryAction({ countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago", ...fields }, true)).error).toContain("Chile");
      expect(await regionalState(businessId)).toEqual(unconnected);
    }
    await prisma.business.update({ where: { id: businessId }, data: { mpAccessToken: "synthetic-mp-not-valid", mpRefreshToken: "synthetic-refresh-not-valid", mpUserId: "synthetic-mp-user", address: "Synthetic address", logoUrl: "/synthetic-logo.svg" } });
    await prisma.commercialSubscription.update({ where: { businessId }, data: { status: "INACTIVE", trialStart: new Date(Date.now() - 40 * 86400000), trialEnd: new Date(Date.now() - 10 * 86400000) } });
    const before = await regionalState(businessId);
    vi.mocked(revalidatePath).mockClear();
    for (const fields of [
      { countryCode: "AR" }, { countryCode: "MX" }, { countryCode: "JP" },
      { currencyCode: "USD" }, { currencyCode: "ARS" },
      { timezone: "America/Mexico_City" }, { timezone: "Asia/Tokyo" },
    ]) {
      const result = await updateBusinessCountryAction({ countryCode: "CL", currencyCode: "CLP", timezone: "America/Santiago", ...fields }, true);
      expect(result.error).toContain("Chile");
      expect(await regionalState(businessId)).toEqual(before);
      expect(revalidatePath).not.toHaveBeenCalled();
    }
    expect((await updateBusinessCountryAction({ countryCode: "CL", currencyCode: "CLP", timezone: "Pacific/Easter" }, false)).error).toContain("confirmar");
    expect(await regionalState(businessId)).toEqual(before);
    for (const timezone of ["America/Coyhaique", "America/Punta_Arenas", "Pacific/Easter"]) {
      expect(await updateBusinessCountryAction({ countryCode: "CL", currencyCode: "CLP", timezone }, true)).toEqual({ success: true });
      const after = await regionalState(businessId);
      expect({ ...after[0], timezone: before[0].timezone, updatedAt: before[0].updatedAt }).toEqual(before[0]);
      expect(after[0].timezone).toBe(timezone);
      expect(after.slice(1)).toEqual(before.slice(1));
    }
  });
  it("retains legacy international editing and existing Mercado Pago compatibility rules", async () => {
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: "synthetic-no-login", name: "Legacy regional fixture" } });
    const businessId = randomUUID(); users.push(user.id); businesses.push(businessId);
    await prisma.business.create({ data: { id: businessId, ownerId: user.id, slug: businessId, apiKey: randomUUID(), name: "Legacy regional fixture", countryCode: "AR", currencyCode: "ARS", timezone: "America/Argentina/Buenos_Aires" } });
    const legacy = await prisma.subscription.create({ data: { businessId, plan: "EQUIPO", status: "ACTIVE", isTrial: false, currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } });
    await prisma.commercialSubscription.create({ data: { businessId, legacySubscriptionId: legacy.id, planCode: "EQUIPO", catalogVersion: COMMERCIAL_CATALOG_VERSION, professionalTotal: 5, currencyCode: "ARS", billingCycle: "MONTHLY", termsSnapshot: { origin: "legacy_import" }, snapshotHash: "synthetic-legacy-snapshot" } });
    actionActor.user = user;
    const before = await regionalState(businessId);
    expect(await updateBusinessCountryAction({ countryCode: "MX", currencyCode: "MXN", timezone: "America/Mexico_City" }, true)).toEqual({ success: true });
    expect((await regionalState(businessId)).slice(1)).toEqual(before.slice(1));
    await prisma.business.update({ where: { id: businessId }, data: { mpAccessToken: "synthetic-legacy-mp-not-valid" } });
    const connected = await regionalState(businessId);
    expect((await updateBusinessCountryAction({ countryCode: "AR", currencyCode: "ARS", timezone: "America/Argentina/Buenos_Aires" }, true)).error).toContain("Desconecta");
    expect((await updateBusinessCountryAction({ countryCode: "MX", currencyCode: "USD", timezone: "America/Mexico_City" }, true)).error).toContain("MXN");
    expect(await regionalState(businessId)).toEqual(connected);
    expect(await updateBusinessCountryAction({ countryCode: "MX", currencyCode: "MXN", timezone: "America/Cancun" }, true)).toEqual({ success: true });
    const after = await regionalState(businessId);
    expect({ ...after[0], timezone: connected[0].timezone, updatedAt: connected[0].updatedAt }).toEqual(connected[0]);
    expect(after.slice(1)).toEqual(connected.slice(1));
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
    expect((await getCommercialPlanAccess(businessId, end)).allowed).toBe(true);
    expect((await getCommercialPlanAccess(businessId, new Date(+end + 48 * 3600000))).allowed).toBe(false);
    sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    expect(sub.lastPaymentEventId).toBeTruthy(); expect(sub.trialEnd).not.toEqual(end);
  });
  it("does not migrate or reprice an existing legacy contract", async () => {
    const password = "Synthetic-legacy-access123";
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: await bcrypt.hash(password, 4), name: "Legacy fixture" } });
    const businessId = `legacy-${randomUUID()}`;
    users.push(user.id); businesses.push(businessId);
    await prisma.business.create({ data: { id: businessId, slug: businessId, apiKey: randomUUID(), name: "Legacy fixture", ownerId: user.id, countryCode: "AR", currencyCode: "ARS", timezone: "America/Argentina/Buenos_Aires" } });
    await prisma.subscription.create({ data: { businessId, plan: "EQUIPO", status: "ACTIVE", isTrial: false, extraStaffCount: 2, staffLimitOverride: null, customMonthlyPriceClp: 24000, paymentMethod: "BANK_TRANSFER", billingCycle: "MONTHLY", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } });
    const before = await prisma.subscription.findUnique({ where: { businessId } });
    const businessBefore = await getBusinessForUser(user.id);
    expect(await verifyCredentials(user.email, password)).toMatchObject({ id: user.id });
    const response = await loginPOST(request("/api/auth/login", { email: user.email, password }));
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect((await getCommercialPlanAccess(businessId)).allowed).toBe(true);
    expect((await getCommercialPlanAccess(businessId)).professionalTotal).toBe(7);
    expect((await getCommercialPlanAccess(businessId)).has("puri.plus")).toBe(false);
    expect(await prisma.subscription.findUnique({ where: { businessId } })).toEqual(before);
    expect(await getBusinessForUser(user.id)).toEqual(businessBefore);
    await expect(prisma.$transaction(tx => createRegistrationContract(tx, { businessId, plan: "PURAGENDA", professionalTotal: 1, billingCycle: "MONTHLY", trialEligible: true }))).rejects.toThrow("REGISTRATION_MARKET_UNSUPPORTED");
    expect(await prisma.commercialSubscription.count({ where: { businessId } })).toBe(0);
    expect(await prisma.subscription.findUnique({ where: { businessId } })).toEqual(before);
    // Currency is checked independently of country at the contract boundary.
    await prisma.business.update({ where: { id: businessId }, data: { countryCode: "CL", currencyCode: "USD" } });
    await expect(prisma.$transaction(tx => createRegistrationContract(tx, { businessId, plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "ANNUAL", trialEligible: true }))).rejects.toThrow("REGISTRATION_MARKET_UNSUPPORTED");
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
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("enforces %s trial credits concurrently and exposes only commercial consumption", async plan => {
    const c = await register(plan), businessId = c.business.id, budget = { limitUnits: 2, limitMicros: 1000 };
    const allocation = { puri: { ALL: budget, STANDARD_INTERACTIVE: budget, PLUS_INTERACTIVE: budget } };
    process.env.COMMERCIAL_USAGE_POLICY_JSON = JSON.stringify({ version: "synthetic-qa-only", trial: { [plan]: allocation }, paid: {}, global: { puri: { limitUnits: 1000000, limitMicros: 1000000 } } });
    const calls = await Promise.allSettled([1, 2, 3].map(() => reserveGrowthUsage({ businessId, category: "STANDARD_INTERACTIVE", key: randomUUID(), inputHash: "synthetic", micros: 1 })));
    expect(calls.filter(result => result.status === "fulfilled")).toHaveLength(2);
    expect(calls.filter(result => result.status === "rejected")).toHaveLength(1);
    const usage = await getCommercialUsageSummary(businessId);
    expect(usage!.items[0]).toMatchObject({ state: "EXHAUSTED", reserved: 2, remaining: 0 });
    expect(JSON.stringify(usage)).not.toMatch(/Micros|Tokens|credential/);
    if (plan === "PURAGENDA") await expect(reserveGrowthUsage({ businessId, category: "PLUS_INTERACTIVE", key: randomUUID(), inputHash: "synthetic", micros: 1 })).rejects.toThrow("PLUS_ENTITLEMENT_REQUIRED");
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId } });
    await expect(reserveGrowthUsage({ businessId, category: "STANDARD_INTERACTIVE", key: randomUUID(), inputHash: "synthetic", micros: 1, now: sub.trialEnd! })).rejects.toThrow("COMMERCIAL_ACCESS_REQUIRED");
    expect(await prisma.puriUsageReservation.count({ where: { businessId } })).toBe(2);
  });
});
