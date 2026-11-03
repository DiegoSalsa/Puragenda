import { Invoice } from "mercadopago";
import { createHmac } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { createMpV2Provider } from "@/server/commercial-billing/mercadopago-v2-provider";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function notificationFixture(type = "subscription_preapproval", extra: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries({
    PURAGENDA_MP_V2_ENABLED: "1", PURAGENDA_MP_V2_ENVIRONMENT: "sandbox",
    DATABASE_URL: "postgresql://synthetic@127.0.0.1:55443/puragenda_commercial_test",
    PURAGENDA_MP_V2_SANDBOX_ACCOUNT_ID: "123", PURAGENDA_MP_V2_SANDBOX_APPLICATION_ID: "456",
    PURAGENDA_MP_V2_SANDBOX_ACCESS_TOKEN: "synthetic-test-only", PURAGENDA_MP_V2_SANDBOX_WEBHOOK_SECRET: "synthetic-test-only",
    PURAGENDA_MP_V2_APP_URL: "http://127.0.0.1:3017",
  })) vi.stubEnv(key, value);
  const resourceId = "sandbox-subscription", requestId = "signed-request", ts = String(Date.now());
  const digest = createHmac("sha256", "synthetic-test-only").update(`id:${resourceId};request-id:${requestId};ts:${ts};`).digest("hex");
  // The official subscription simulator sends this v8 envelope without live_mode.
  const raw = JSON.stringify({ id: "123456", type, action: "updated", application_id: "456", entity: "preapproval", version: 8, data: { id: resourceId }, ...extra });
  const headers = new Headers({ "x-request-id": requestId, "x-signature": `ts=${ts},v1=${digest}` });
  return { provider: createMpV2Provider(), raw, headers, resourceId };
}

it.each(["subscription_preapproval", "subscription_authorized_payment"])("accepts the signed official %s envelope without live_mode for canonical reconciliation", type => {
  const { provider, raw, headers, resourceId } = notificationFixture(type);
  expect(provider.verifyWebhook(raw, headers, resourceId)).toMatchObject({ id: "123456", type, resourceId });
});

it("still requires the wire environment on payment notifications", () => {
  const { provider, raw, headers, resourceId } = notificationFixture("payment");
  expect(() => provider.verifyWebhook(raw, headers, resourceId)).toThrow();
});

it.each([{ live_mode: true }, { application_id: "999" }])("rejects explicit foreign environment or application metadata: %j", extra => {
  const { provider, raw, headers, resourceId } = notificationFixture("subscription_preapproval", extra);
  expect(() => provider.verifyWebhook(raw, headers, resourceId)).toThrow();
});

it("does not accept unsigned subscription envelopes when live_mode is absent", () => {
  const { provider, raw, resourceId } = notificationFixture();
  expect(() => provider.verifyWebhook(raw, new Headers(), resourceId)).toThrow();
});

it("reads every invoice using pages accepted by Mercado Pago's subscription API", async () => {
  for (const [key, value] of Object.entries({
    PURAGENDA_MP_V2_ENABLED: "1", PURAGENDA_MP_V2_ENVIRONMENT: "sandbox",
    DATABASE_URL: "postgresql://synthetic@127.0.0.1:55443/puragenda_commercial_test",
    PURAGENDA_MP_V2_SANDBOX_ACCOUNT_ID: "123", PURAGENDA_MP_V2_SANDBOX_APPLICATION_ID: "456",
    PURAGENDA_MP_V2_SANDBOX_ACCESS_TOKEN: "synthetic-test-only", PURAGENDA_MP_V2_SANDBOX_WEBHOOK_SECRET: "synthetic-test-only",
    PURAGENDA_MP_V2_APP_URL: "http://127.0.0.1:3017",
  })) vi.stubEnv(key, value);
  const rows = Array.from({ length: 13 }, (_, id) => ({ id: String(id), preapproval_id: "subscription-test", debit_date: "2026-10-28T12:00:00Z", currency_id: "CLP", transaction_amount: 12990 }));
  const search = vi.spyOn(Invoice.prototype, "search").mockImplementation(async ({ options } = {}) => {
    const limit = options?.limit ?? 12, offset = options?.offset ?? 0;
    // Real sandbox rejected both 100 and 20; omitting limit returned pages of 12.
    if (limit < 1 || limit > 12) throw new Error("Invalid value for limit");
    expect(options?.preapproval_id).toBe("subscription-test");
    return { results: rows.slice(offset, offset + limit), paging: { total: rows.length, offset, limit } };
  });
  const invoices = await createMpV2Provider().invoices("subscription-test");
  expect(invoices.map(row => row.id)).toEqual(rows.map(row => String(row.id)));
  expect(search).toHaveBeenCalledTimes(2);
});
