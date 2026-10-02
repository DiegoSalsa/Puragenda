import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const context = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://websiteqa@127.0.0.1:55439/websiteqa";
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.WEBSITE_QA = "1";
  process.env.WEBSITE_BILLING_SIMULATOR = "1";
  process.env.WEBSITE_CHECKOUT_ENABLED = "1";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3005";
  return { businessId: "mp-a", owner: vi.fn() };
});
vi.mock("@/server/websites/service", () => ({ requireWebsiteManager: context.owner }));
import { prisma } from "@/server/db/prisma";
import { startMercadoPagoWebsiteCheckout, changeMercadoPagoWebsiteBilling, recoverMercadoPagoWebsitePayment, fetchWebsitePreapproval, syncMercadoPagoWebsiteInvoice, syncMercadoPagoWebsitePreapproval, websiteBillingSimulatorEnabled } from "@/server/websites/mercadopago-billing";
import { startWebsiteTrial } from "@/server/websites/checkout";
import { hasWebsiteEntitlement } from "@/websites/policy";
import { WEBSITE_TRIAL_MS } from "@/websites/offers";

const enabled = process.env.WEBSITE_BILLING_TEST_DATABASE_URL === "postgresql://websiteqa@127.0.0.1:55439/websiteqa";
describe.skipIf(!enabled)("Mercado Pago Website with real isolated PostgreSQL and simulated provider", () => {
  beforeAll(async () => {
    await prisma.user.upsert({ where: { id: "mp-owner" }, create: { id: "mp-owner", email: "mp-owner@example.test", password: "not-a-login", name: "MP QA" }, update: {} });
    await prisma.websiteLaunchSnapshot.upsert({ where: { id: "mp-snapshot" }, create: { id: "mp-snapshot", launchAt: new Date("2026-10-01T00:00:01Z"), capturedAt: new Date(), memberCount: 1 }, update: {} });
  });
  beforeEach(async () => {
    vi.useRealTimers();
    vi.stubEnv("WEBSITE_CHECKOUT_ENABLED", "1");
    context.businessId = "mp-a";
    context.owner.mockImplementation(async () => ({ business: await prisma.business.findUniqueOrThrow({ where: { id: context.businessId } }), user: { id: "mp-owner", email: "mp-owner@example.test" } }));
    await prisma.business.deleteMany({ where: { id: { in: ["mp-a", "mp-b"] } } });
    for (const id of ["mp-a", "mp-b"]) {
      await prisma.business.create({ data: { id, ownerId: "mp-owner", name: id, slug: id, apiKey: `local-${id}`, countryCode: "CL" } });
      await prisma.subscription.create({ data: { businessId: id, plan: "INDIVIDUAL", status: "ACTIVE", isTrial: false, mpSubscriptionId: `MP-BASE-${id}`, currentPeriodEnd: new Date(Date.now() + 90 * 86400000) } });
    }
    await prisma.websiteOfferEligibility.create({ data: { businessId: "mp-a", snapshotId: "mp-snapshot", eligibleAt: new Date("2026-10-01"), offerCode: "BETA_FOUNDER" } });
  });
  afterAll(async () => {
    vi.useRealTimers();
    await prisma.business.deleteMany({ where: { id: { in: ["mp-a", "mp-b"] } } });
    await prisma.websiteLaunchSnapshot.deleteMany({ where: { id: "mp-snapshot" } });
    await prisma.user.deleteMany({ where: { id: "mp-owner" } });
    await prisma.$disconnect();
  });
  async function operation() {
    await startMercadoPagoWebsiteCheckout();
    return prisma.websiteCheckoutOperation.findFirstOrThrow({ where: { addon: { businessId: context.businessId } }, orderBy: { createdAt: "desc" } });
  }
  async function invoice(status = "approved", overrides = {}) {
    const op = await operation();
    await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { providerStatus: "authorized" } });
    return { id: `invoice-${op.id}`, preapproval_id: op.mpSubscriptionId!, transaction_amount: op.amount, currency_id: "CLP", debit_date: new Date().toISOString(), last_modified: new Date().toISOString(), payment: { id: `payment-${op.id}`, status }, ...overrides };
  }
  it("creates founder 5990 and standard 9990 for the same owner, ignoring forged arguments", async () => {
    const a = await operation(); expect(a.amount).toBe(5990); expect(a.priceTier).toBe("BETA_FOUNDER");
    context.businessId = "mp-b";
    await (startMercadoPagoWebsiteCheckout as (...input: unknown[]) => unknown)({ amount: 1, tier: "BETA_FOUNDER", businessId: "mp-a" });
    const b = await prisma.websiteCheckoutOperation.findFirstOrThrow({ where: { addon: { businessId: "mp-b" } } });
    expect(b.amount).toBe(9990); expect(b.priceTier).toBe("STANDARD");
  });
  it("serializes triple clicks into one operation and one agreement", async () => {
    const results = await Promise.allSettled([startMercadoPagoWebsiteCheckout(), startMercadoPagoWebsiteCheckout(), startMercadoPagoWebsiteCheckout()]);
    expect(results.some(r => r.status === "fulfilled")).toBe(true);
    expect(await prisma.websiteCheckoutOperation.count({ where: { addon: { businessId: "mp-a" } } })).toBe(1);
  });
  it("reuses pending checkout, never activates on abandonment or return", async () => {
    const first = await startMercadoPagoWebsiteCheckout(); const second = await startMercadoPagoWebsiteCheckout();
    expect(second.checkoutUrl).toBe(first.checkoutUrl);
    const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } });
    expect(hasWebsiteEntitlement(addon)).toBe(false);
  });
  it("authorized agreement alone never grants paid entitlement", async () => {
    const op = await operation(); await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { providerStatus: "authorized" } });
    await syncMercadoPagoWebsitePreapproval(await fetchWebsitePreapproval(op.mpSubscriptionId!));
    expect((await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } })).status).toBe("INACTIVE");
  });
  it.each([1,5,10,14])("preserves all 15 free days when contracted on day %i", async day => {
    const start = new Date(Date.now() - day * 86400000), end = new Date(start.getTime() + WEBSITE_TRIAL_MS);
    await prisma.websiteOfferEligibility.update({ where: { businessId: "mp-a" }, data: { trialStartedAt: start, trialConsumedAt: start, trialEndsAt: end } });
    const op = await operation(); expect(op.firstChargeAt).toEqual(end);
    expect(hasWebsiteEntitlement(null, new Date(), await prisma.websiteOfferEligibility.findUnique({ where: { businessId: "mp-a" } }))).toBe(true);
  });
  it("starts trial only explicitly and consumes it once with an exact boundary", async () => {
    let offer = await prisma.websiteOfferEligibility.findUniqueOrThrow({ where: { businessId: "mp-a" } }); expect(offer.trialStartedAt).toBeNull();
    await startWebsiteTrial(); await expect(startWebsiteTrial()).rejects.toThrow("ya fue utilizada");
    offer = await prisma.websiteOfferEligibility.findUniqueOrThrow({ where: { businessId: "mp-a" } });
    expect(offer.trialEndsAt!.getTime() - offer.trialStartedAt!.getTime()).toBe(WEBSITE_TRIAL_MS);
    expect(hasWebsiteEntitlement(null, new Date(offer.trialEndsAt!.getTime() - 1), offer)).toBe(true);
    expect(hasWebsiteEntitlement(null, offer.trialEndsAt!, offer)).toBe(false);
  });
  it("standard cannot start founder trial", async () => { context.businessId = "mp-b"; await expect(startWebsiteTrial()).rejects.toThrow("disponible"); });
  it("blocks early invoice without destroying trial", async () => {
    await startWebsiteTrial(); const op = await operation();
    await expect(syncMercadoPagoWebsiteInvoice(await invoice())).rejects.toThrow("anterior");
    expect((await prisma.websiteAddon.findUniqueOrThrow({ where: { id: op.addonId } })).status).toBe("INACTIVE");
  });
  it.each(["pending", "rejected"])("%s payment cannot activate an unpaid site", async status => {
    await syncMercadoPagoWebsiteInvoice(await invoice(status));
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({ where: { businessId: "mp-a" } }))).toBe(false);
  });
  it("settled payment activates once, duplicate invoice creates one activation", async () => {
    const data = await invoice(); await syncMercadoPagoWebsiteInvoice(data); await syncMercadoPagoWebsiteInvoice(data);
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({ where: { businessId: "mp-a" } }))).toBe(true);
    expect(await prisma.websiteCommercialEvent.count({ where: { businessId: "mp-a", event: "website_beta_activated" } })).toBe(1);
  });
  it("does not revert active status from older rejected invoice or preapproval", async () => {
    const data = await invoice(); await syncMercadoPagoWebsiteInvoice(data);
    await syncMercadoPagoWebsiteInvoice({ ...data, last_modified: new Date(Date.now() - 1000).toISOString(), payment: { ...data.payment, status: "rejected" } });
    const sub = await fetchWebsitePreapproval(data.preapproval_id);
    await syncMercadoPagoWebsitePreapproval({ ...sub, status: "pending", last_modified: new Date(Date.now() - 1000).toISOString() });
    expect((await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } })).status).toBe("ACTIVE");
  });
  it.each([{ transaction_amount: 1 }, { currency_id: "USD" }])("rejects a forged invoice amount/currency %j", async forged => {
    await expect(syncMercadoPagoWebsiteInvoice(await invoice("approved", forged))).rejects.toThrow("Monto");
  });
  it("rejects another operation's reference and unrelated base subscription", async () => {
    const op = await operation(); const sub = await fetchWebsitePreapproval(op.mpSubscriptionId!);
    await expect(syncMercadoPagoWebsitePreapproval({ ...sub, external_reference: "website:another-tenant" })).rejects.toThrow("no corresponde");
    expect(await syncMercadoPagoWebsitePreapproval({ ...sub, id: "MP-BASE-mp-a", external_reference: "base" })).toBe(false);
  });
  it("cancel stops only MP-WEB and retains period; MP-BASE is unchanged", async () => {
    const data = await invoice(); await syncMercadoPagoWebsiteInvoice(data);
    await changeMercadoPagoWebsiteBilling("cancel", true);
    const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } });
    expect(addon.cancelAt).toEqual(addon.validUntil); expect(hasWebsiteEntitlement(addon)).toBe(true);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { businessId: "mp-a" } })).mpSubscriptionId).toBe("MP-BASE-mp-a");
    expect((await prisma.subscription.findUniqueOrThrow({ where: { businessId: "mp-a" } })).status).toBe("ACTIVE");
    expect(hasWebsiteEntitlement(addon, addon.validUntil!)).toBe(false);
  });
  it("requires confirmation and never cancels another tenant's website", async () => {
    const op = await operation(); await expect(changeMercadoPagoWebsiteBilling("cancel", false)).rejects.toThrow("Confirma");
    context.businessId = "mp-b"; await expect(changeMercadoPagoWebsiteBilling("cancel", true)).rejects.toThrow();
    expect((await prisma.websiteCheckoutOperation.findUniqueOrThrow({ where: { id: op.id } })).providerStatus).toBe("pending");
  });
  it("reactivation before period end preserves the paid days and founder price", async () => {
    const paid = await invoice(); await syncMercadoPagoWebsiteInvoice(paid);
    await changeMercadoPagoWebsiteBilling("cancel", true);
    const cancelled = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } });
    const result = await changeMercadoPagoWebsiteBilling("reactivate", true);
    expect(result).toMatchObject({ provider: "mercadopago", firstChargeAt: cancelled.validUntil!.toISOString() });
    const latest = await prisma.websiteCheckoutOperation.findFirstOrThrow({ where: { addonId: cancelled.id }, orderBy: { createdAt: "desc" } });
    expect(latest.amount).toBe(5990); expect(latest.mpSubscriptionId).not.toBe(paid.preapproval_id);
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({ where: { businessId: "mp-a" } }))).toBe(true);
  });
  it("paid cancellation followed by a late checkout retains founder eligibility without trial reset", async () => {
    const paid = await invoice(); await syncMercadoPagoWebsiteInvoice(paid); await changeMercadoPagoWebsiteBilling("cancel", true);
    await prisma.websiteAddon.update({ where: { businessId: "mp-a" }, data: { status: "CANCELLED", validUntil: new Date(Date.now() - 86400000), cancelAt: new Date(Date.now() - 86400000) } });
    const result = await startMercadoPagoWebsiteCheckout(); expect(result.firstChargeAt).toBeNull();
    const latest = await prisma.websiteCheckoutOperation.findFirstOrThrow({ where: { addon: { businessId: "mp-a" } }, orderBy: { createdAt: "desc" } }); expect(latest.amount).toBe(5990);
  });
  it("past-due recovery replaces only the failed Website agreement", async () => {
    const failed = await invoice("rejected"); await syncMercadoPagoWebsiteInvoice(failed);
    expect((await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: "mp-a" } })).status).toBe("PAST_DUE");
    const result = await recoverMercadoPagoWebsitePayment(); expect(result.provider).toBe("mercadopago");
    expect((await prisma.subscription.findUniqueOrThrow({ where: { businessId: "mp-a" } })).status).toBe("ACTIVE");
    expect(await prisma.websiteCheckoutOperation.count({ where: { addon: { businessId: "mp-a" } } })).toBe(2);
  });
  it("cancelling a refunded or past-due period cannot restore unpaid access", async () => {
    const paid = await invoice(); await syncMercadoPagoWebsiteInvoice(paid);
    await prisma.websiteAddon.update({ where: { businessId: "mp-a" }, data: { status: "PAST_DUE" } });
    await changeMercadoPagoWebsiteBilling("cancel", true);
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({ where: { businessId: "mp-a" } }))).toBe(false);
    const retry = await startMercadoPagoWebsiteCheckout(); expect(retry.firstChargeAt).toBeNull();
  });
  it("unknown provider outcome cannot cause unlimited checkout retries", async () => {
    const op = await operation(); await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { state: "UNKNOWN", mpSubscriptionId: null } });
    for (let i = 0; i < 3; i++) await expect(startMercadoPagoWebsiteCheckout()).rejects.toThrow("conciliando");
    expect(await prisma.websiteCheckoutOperation.count({ where: { addonId: op.addonId } })).toBe(1);
  });
  it("expired pending URL must be cancelled before another agreement", async () => {
    const op = await operation(); await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(startMercadoPagoWebsiteCheckout()).rejects.toThrow("venció"); expect(await prisma.websiteCheckoutOperation.count({ where: { addonId: op.addonId } })).toBe(1);
    await changeMercadoPagoWebsiteBilling("cancel", true); await startMercadoPagoWebsiteCheckout(); expect(await prisma.websiteCheckoutOperation.count({ where: { addonId: op.addonId } })).toBe(2);
  });
  it("founder still pays 5990 after trial expiry a year later", async () => {
    const start = new Date(Date.now() - 365 * 86400000);
    await prisma.websiteOfferEligibility.update({ where: { businessId: "mp-a" }, data: { trialStartedAt: start, trialConsumedAt: start, trialEndsAt: new Date(start.getTime() + WEBSITE_TRIAL_MS) } });
    expect((await operation()).amount).toBe(5990);
  });
  it("acquisition kill switch blocks new checkout without removing settled access", async () => {
    await syncMercadoPagoWebsiteInvoice(await invoice()); vi.stubEnv("WEBSITE_CHECKOUT_ENABLED", "0");
    await expect(startMercadoPagoWebsiteCheckout()).rejects.toThrow("pausadas");
    expect(hasWebsiteEntitlement(await prisma.websiteAddon.findUnique({ where: { businessId: "mp-a" } }))).toBe(true);
  });
  it("base operational access is required", async () => {
    await prisma.subscription.update({ where: { businessId: "mp-a" }, data: { status: "INACTIVE" } });
    await expect(startMercadoPagoWebsiteCheckout()).rejects.toThrow("plan Puragenda");
  });
  it("simulator refuses production runtime and remote database", () => {
    vi.stubEnv("NODE_ENV", "production"); expect(websiteBillingSimulatorEnabled()).toBe(false); vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://example.invalid/websiteqa"); expect(websiteBillingSimulatorEnabled()).toBe(false); vi.stubEnv("DATABASE_URL", "postgresql://websiteqa@127.0.0.1:55439/websiteqa");
  });
});
