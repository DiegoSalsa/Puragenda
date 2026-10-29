import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { billingPeriodEnd, changeTiming, expansionAmount, includedVat, v2Quote } from "@/core/commercial-billing-policy";
import { MpV2Provider, mpV2Configuration, MP_V2_APPROVED_TEST_IDENTITY, type MpV2Port } from "@/server/commercial-billing/mercadopago-v2-provider";

const selection = { plan: "PURAGENDA" as const, professionalTotal: 1, billingCycle: "MONTHLY" as const };
const config = { environment: "V2_SANDBOX" as const, accountId: 123, applicationId: 456, token: "synthetic-unit-test", secret: "synthetic-test-webhook", returnUrl: "http://127.0.0.1:3012/dashboard/settings", webhookUrl: "https://example.invalid/webhook" };
describe("V2 commercial billing policy and provider boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("quotes %s, both periods and 1/2/5/20 seats using the catalog", plan => {
    for (const professionalTotal of [1, 2, 5, 20]) {
      const monthly = v2Quote({ plan, professionalTotal, billingCycle: "MONTHLY" }), annual = v2Quote({ plan, professionalTotal, billingCycle: "ANNUAL" });
      expect(annual.cycleTotal).toBe(monthly.cycleTotal * 10);
      expect(includedVat(annual.cycleTotal).net + includedVat(annual.cycleTotal).vat).toBe(annual.cycleTotal);
      expect(includedVat(monthly.cycleTotal).vat).toBe(monthly.cycleTotal - Math.round(monthly.cycleTotal / 1.19));
    }
  });
  it("preserves monthly anchors and leap-year annual periods", () => {
    const january = new Date("2028-01-31T12:00:00Z"), february = billingPeriodEnd(january, "MONTHLY");
    expect(february.toISOString()).toBe("2028-02-29T12:00:00.000Z");
    expect(billingPeriodEnd(february, "MONTHLY", 31).toISOString()).toBe("2028-03-31T12:00:00.000Z");
    expect(billingPeriodEnd(february, "ANNUAL").toISOString()).toBe("2029-02-28T12:00:00.000Z");
    expect(billingPeriodEnd(new Date("2027-02-28T12:00:00Z"), "ANNUAL", 29).toISOString()).toBe("2028-02-29T12:00:00.000Z");
  });
  it("charges only the remaining upgrade delta, rounds up one CLP and defers reductions", () => {
    const target = { ...selection, professionalTotal: 2 };
    expect(changeTiming(selection, target)).toBe("IMMEDIATE");
    expect(expansionAmount(selection, target, new Date(0), new Date(30000), new Date(15000))).toBe(2500);
    expect(expansionAmount(selection, target, new Date(0), new Date(30000), new Date(29999))).toBe(1);
    expect(changeTiming(target, selection)).toBe("NEXT_RENEWAL");
    expect(changeTiming({ ...selection, plan: "PURAGENDA_PLUS" }, target)).toBe("NEXT_RENEWAL");
    expect(() => changeTiming(selection, { ...target, billingCycle: "ANNUAL" })).toThrow("BILLING_CYCLE_CHANGE_REQUIRES_RENEWAL");
    expect(() => v2Quote({ ...selection, professionalTotal: 21 })).toThrow();
  });
  it("requires explicit runtime credentials and a separate production switch", () => {
    vi.stubEnv("PURAGENDA_MP_V2_ENABLED", "0"); expect(() => mpV2Configuration()).toThrow("V2_BILLING_DISABLED");
    vi.stubEnv("PURAGENDA_MP_V2_ENABLED", "1"); vi.stubEnv("PURAGENDA_MP_V2_ENVIRONMENT", "production"); vi.stubEnv("PURAGENDA_MP_V2_PRODUCTION_WRITES", "0");
    expect(() => mpV2Configuration()).toThrow("V2_PRODUCTION_WRITES_DISABLED");
    vi.stubEnv("PURAGENDA_MP_V2_ENVIRONMENT", "sandbox"); vi.stubEnv("PURAGENDA_MP_V2_SANDBOX_ACCESS_TOKEN", "");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic@127.0.0.1:55439/puragenda_commercial_test");
    expect(() => mpV2Configuration()).toThrow("V2_BILLING_CONFIGURATION_REQUIRED");
  });
  it("verifies signatures, signed IDs, environment and freshness before any provider IO", () => {
    const provider = new MpV2Provider(config, {} as MpV2Port), id = "abc123", ts = String(Math.floor(Date.now() / 1000)), req = "request-test";
    const hash = createHmac("sha256", config.secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");
    const headers = new Headers({ "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": req });
    const raw = JSON.stringify({ id: "event-1", type: "subscription_preapproval", data: { id }, live_mode: false });
    expect(provider.verifyWebhook(raw, headers, id).resourceId).toBe(id);
    expect(() => provider.verifyWebhook(raw, headers, "tampered")).toThrow();
    expect(() => provider.verifyWebhook(raw.replace('"live_mode":false', '"live_mode":true'), headers, id)).toThrow();
    expect(() => provider.verifyWebhook(raw, new Headers({ "x-signature": "ts=1,v1=invalid", "x-request-id": req }), id)).toThrow();
  });
  it("checks test account tags instead of assuming every APP_USR token is production", async () => {
    const port = { account: vi.fn(async () => ({ id: 123, site_id: "MLC", tags: ["test_user"] })) } as unknown as MpV2Port;
    await expect(new MpV2Provider(config, port).checkAccount()).resolves.toBeUndefined();
    await expect(new MpV2Provider({ ...config, environment: "V2_PRODUCTION" }, port).checkAccount()).rejects.toThrow("V2_PROVIDER_ACCOUNT_MISMATCH");
  });
  it("requires canonical test-account verification for explicit sandbox live-mode responses", async () => {
    const identity = MP_V2_APPROVED_TEST_IDENTITY;
    const row = { id: "1", status: "approved", live_mode: true, collector_id: Number(identity.accountId), currency_id: "CLP", transaction_amount: 12990, date_last_updated: new Date() };
    const account = vi.fn(async () => ({ id: identity.accountId, site_id: "MLC", tags: [] as string[] }));
    const provider = new MpV2Provider({ ...config, ...identity, sandboxAccountLiveMode: true }, { account, payment: async () => row } as unknown as MpV2Port);
    await expect(provider.payment("1")).rejects.toThrow("V2_PROVIDER_ACCOUNT_MISMATCH");
    account.mockResolvedValue({ id: identity.accountId, site_id: "MLC", tags: ["test_user"] });
    await expect(provider.payment("1")).resolves.toMatchObject({ live_mode: true, collector_id: identity.accountId });
    row.collector_id = 999;
    await expect(provider.payment("1")).rejects.toThrow("V2_PAYMENT_ACCOUNT_MISMATCH");
    row.collector_id = identity.accountId; row.live_mode = false;
    await expect(provider.payment("1")).rejects.toThrow("V2_PAYMENT_ACCOUNT_MISMATCH");
  });
  it("pins the live-mode exception to the accepted test seller/application and refuses production", () => {
    for (const overrides of [{ accountId: 123 }, { applicationId: 456 }, { environment: "V2_PRODUCTION" as const }]) {
      expect(() => new MpV2Provider({ ...config, ...MP_V2_APPROVED_TEST_IDENTITY, sandboxAccountLiveMode: true, ...overrides }, {} as MpV2Port)).toThrow("V2_UNAPPROVED_SANDBOX_LIVE_MODE");
    }
  });
  it("requires the canonical application ID as well as the verified test seller for the exception", async () => {
    const identity = MP_V2_APPROVED_TEST_IDENTITY;
    const provider = new MpV2Provider({ ...config, ...identity, sandboxAccountLiveMode: true }, {
      account: async () => ({ id: identity.accountId, site_id: "MLC", tags: ["test_user"] }),
    } as unknown as MpV2Port);
    const subscription = { id: "test-sub", collector_id: identity.accountId, status: "authorized", external_reference: "synthetic",
      live_mode: true, auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: 12990, currency_id: "CLP" } };
    expect(() => provider.validateSubscription({ ...subscription, application_id: identity.applicationId })).toThrow("V2_PROVIDER_ACCOUNT_MISMATCH");
    await provider.checkAccount();
    expect(() => provider.validateSubscription(subscription)).toThrow("V2_PROVIDER_ACCOUNT_MISMATCH");
    expect(() => provider.validateSubscription({ ...subscription, application_id: 456 })).toThrow("V2_PROVIDER_ACCOUNT_MISMATCH");
    expect(provider.validateSubscription({ ...subscription, application_id: identity.applicationId }).id).toBe("test-sub");
  });
  it("rejects foreign accounts, real payments in sandbox and unsafe checkout URLs", async () => {
    const row = { id: "1", status: "approved", live_mode: true, collector_id: 123, currency_id: "CLP", transaction_amount: 12990, date_last_updated: new Date() };
    const provider = new MpV2Provider(config, { payment: async () => row } as unknown as MpV2Port);
    await expect(provider.payment("1")).rejects.toThrow("V2_PAYMENT_ACCOUNT_MISMATCH");
    for (const url of ["javascript:alert(1)", "https://www.mercadopago.cl.evil.invalid/checkout/start", "https://user@www.mercadopago.cl/checkout/start"]) expect(() => provider.checkoutUrl(url)).toThrow();
    expect(() => provider.checkoutUrl("https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=foreign", "ours")).toThrow();
  });
});
