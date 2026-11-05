import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ get: vi.fn(), invoice: vi.fn(), syncAgreement: vi.fn(), syncInvoice: vi.fn(), base: vi.fn(), processBase: vi.fn(), invoiceByPayment: vi.fn(), v2: vi.fn() }));
vi.mock("mercadopago", async original => ({ ...await original<typeof import("mercadopago")>(), PreApproval: class { get = m.get; }, Invoice: class { get = m.invoice; } }));
vi.mock("@/server/db/prisma", () => ({ prisma: { subscription: { findFirst: m.base } } }));
vi.mock("@/server/websites/mercadopago-billing", () => ({ syncMercadoPagoWebsitePreapproval: m.syncAgreement, syncMercadoPagoWebsiteInvoice: m.syncInvoice }));
vi.mock("@/server/services/subscription-dunning.service", () => ({ getMercadoPagoInvoiceByPaymentId: m.invoiceByPayment, processMercadoPagoInvoice: m.processBase }));
vi.mock("@/server/commercial-billing/mercadopago-v2", () => ({ handleMpV2Webhook: m.v2 }));
import { POST } from "@/app/api/webhooks/mercadopago/route";
const secret = "local-webhook-test-secret-only";
function request(type = "subscription_preapproval", valid = true, overrides = {}) {
  const ts = String(Date.now()); const id = "mp-web-123"; const rid = "request-test";
  const hash = createHmac("sha256", secret).update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex");
  return new NextRequest(`https://puragenda.cl/api/webhooks/mercadopago?data.id=${id}&type=${type}`, { method: "POST", headers: { "content-type": "application/json", "x-request-id": rid, "x-signature": `ts=${ts},v1=${valid ? hash : "invalid"}` }, body: JSON.stringify({ data: { id }, ...overrides }) });
}
describe("Website MP routing uses verified provider resources", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", secret); m.get.mockResolvedValue({ id: "mp-web-123", status: "authorized", external_reference: "website:server-created" }); m.invoice.mockResolvedValue({ id: "invoice-1", preapproval_id: "mp-web-123" }); m.base.mockResolvedValue(null); });
  it("invalid signature cannot fetch provider or activate Website/base", async () => {
    expect((await POST(request(undefined, false))).status).toBe(401);
    expect(m.get).not.toHaveBeenCalled(); expect(m.syncAgreement).not.toHaveBeenCalled(); expect(m.base).not.toHaveBeenCalled();
  });
  it("missing secret fails closed", async () => { vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", ""); expect((await POST(request())).status).toBe(401); expect(m.get).not.toHaveBeenCalled(); });
  it("Website preapproval is consumed before base lookup", async () => {
    m.syncAgreement.mockResolvedValue(true); expect((await POST(request())).status).toBe(200);
    expect(m.syncAgreement).toHaveBeenCalledWith(await m.get.mock.results[0].value); expect(m.base).not.toHaveBeenCalled();
  });
  it("client callback/metadata is never the activation source", async () => {
    m.syncAgreement.mockResolvedValue(true); await POST(request(undefined, true, { status: "approved", amount: 5990, businessId: "other", success: true }));
    expect(m.syncAgreement).toHaveBeenCalledWith({ id: "mp-web-123", status: "authorized", external_reference: "website:server-created" });
  });
  it("Website invoice is consumed before base dunning", async () => {
    m.syncInvoice.mockResolvedValue(true); expect((await POST(request("subscription_authorized_payment"))).status).toBe(200); expect(m.processBase).not.toHaveBeenCalled();
  });
  it("unrelated base invoice still reaches existing base processor", async () => {
    m.syncInvoice.mockResolvedValue(false); await POST(request("subscription_authorized_payment")); expect(m.processBase).toHaveBeenCalledWith({ id: "invoice-1", preapproval_id: "mp-web-123" });
  });
  it("unbound Website operation returns retryable error", async () => {
    m.syncAgreement.mockRejectedValue(new Error("Checkout pendiente de conciliación")); expect((await POST(request())).status).toBe(500); expect(m.base).not.toHaveBeenCalled();
  });
  it("routes a canonical V2 preapproval through its signed reconciler, preserving the existing application callback", async () => {
    m.get.mockResolvedValue({ id: "mp-web-123", external_reference: "v2_durable-operation" });
    expect((await POST(request())).status).toBe(200);
    expect(m.v2).toHaveBeenCalledOnce();
    expect(m.syncAgreement).not.toHaveBeenCalled(); expect(m.base).not.toHaveBeenCalled();
  });
  it("never selects V2 from untrusted notification fields", async () => {
    await POST(request(undefined, true, { external_reference: "v2_forged" }));
    expect(m.v2).not.toHaveBeenCalled();
  });
  it("preserves a retryable failure when V2 reconciliation rejects the signature or account", async () => {
    m.get.mockResolvedValue({ id: "mp-web-123", external_reference: "v2_durable-operation" });
    m.v2.mockRejectedValue(new Error("V2_PROVIDER_ACCOUNT_MISMATCH"));
    expect((await POST(request())).status).toBe(500);
    expect(m.base).not.toHaveBeenCalled();
  });
});
