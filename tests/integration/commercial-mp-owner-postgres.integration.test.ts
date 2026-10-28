import { COMMERCIAL_PLAN_METADATA } from "@/core/commercial-catalog";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createCommercialSubscriptionSnapshot } from "@/server/services/commercial-subscription-v2.service";
import { getCommercialEntitlementShadow } from "@/server/services/commercial-entitlements.service";
import { cancelOwnerMercadoPago, checkoutOwnerMercadoPago, loadOwnerMercadoPago, requireCommercialBillingOwner } from "@/server/commercial-billing/mercadopago-owner";
import { MercadoPagoSandboxAdapter } from "@/server/commercial-billing/mercadopago-sandbox";
import { processSandboxBillingWebhook, reconcileReadyMercadoPagoPeriods } from "@/server/commercial-billing/operations";
import { mpFixture, mpNotification, mpSignature, webhookSecret } from "../fixtures/commercial-provider-fixtures";
const local = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const users: string[] = [], businesses: string[] = [];
async function setup() {
  const id = `mp-owner-${randomUUID()}`;
  const user = await prisma.user.create({ data: { name: "Synthetic owner", email: `${id}@example.invalid`, password: "fixture-no-login", role: "ADMIN" } }); users.push(user.id);
  await prisma.business.create({ data: { id, slug: id, name: "Synthetic CL", countryCode: "CL", apiKey: randomUUID(), ownerId: user.id } }); businesses.push(id);
  await createCommercialSubscriptionSnapshot({ businessId: id, provider: "MERCADO_PAGO", plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "MONTHLY", status: "PENDING_PAYMENT", termsSnapshot: { sandboxFixture: true, vatIncluded: true } });
  const provider = mpFixture();
  provider.state.payment.id = Math.floor(Math.random() * 1_000_000_000) + 1000;
  provider.state.invoice.payment.id = provider.state.payment.id;
  const remoteId = randomUUID().replaceAll("-", "");
  provider.state.sub.id = remoteId; provider.state.invoice.preapproval_id = remoteId;
  Object.assign(provider.state.sub, { init_point: `https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${remoteId}` });
  const owner = await requireCommercialBillingOwner(user.id);
  const send = (type = "payment", resource = String(provider.state.payment.id), now?: Date) => {
    const raw = mpNotification(randomUUID(), type, resource);
    return processSandboxBillingWebhook(raw, mpSignature(raw), provider.adapter, now ?? new Date());
  };
  async function pay() {
    await checkoutOwnerMercadoPago(owner, provider.adapter);
    provider.state.payment.transaction_amount = COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly;
    provider.state.payment.date_last_updated = new Date().toISOString();
    await send();
  }
  return { owner, user, provider, send, pay };
}
local("MP owner checkout and paid lifecycle on real PostgreSQL (contract fixture, no external payment)", () => {
  beforeAll(() => { vi.stubEnv("COMMERCIAL_V2_SANDBOX_WRITES", "1"); vi.stubEnv("COMMERCIAL_V2_MP_OWNER_SANDBOX", "1"); vi.stubEnv("COMMERCIAL_V2_MP_TEST_PAYER_EMAIL", "technical-test@example.invalid"); });
  afterAll(async () => { await prisma.business.deleteMany({ where: { id: { in: businesses } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); vi.unstubAllEnvs(); });
  it("concurrent owner clicks create one remote contract and never grant access from a checkout URL", async () => {
    const f = await setup();
    const results = await Promise.all([checkoutOwnerMercadoPago(f.owner, f.provider.adapter), checkoutOwnerMercadoPago(f.owner, f.provider.adapter)]);
    expect(f.provider.state.calls).toBe(1);
    expect(results.every(r => r.checkoutUrl?.startsWith("https://www.mercadopago.cl/"))).toBe(true);
    expect((await getCommercialEntitlementShadow(f.owner.businessId)).commercialAccess).toBe(false);
    expect(await prisma.commercialEvent.count({ where: { businessId: f.owner.businessId, operation: "OWNER_CHECKOUT_CONFIRMED" } })).toBe(1);
  });
  it("a distinct recurring payment advances the paid period exactly once under duplicate delivery", async () => {
    const f = await setup(); await f.pay();
    const initial = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } });
    const start = initial.periodEnd!, end = new Date(+start + 30 * 86_400_000), now = new Date(+start + 5000);
    f.provider.state.invoice.debit_date = start.toISOString(); f.provider.state.sub.next_payment_date = end.toISOString();
    f.provider.state.payment.id++; f.provider.state.invoice.payment.id = f.provider.state.payment.id;
    f.provider.state.payment.date_last_updated = new Date(+start + 1000).toISOString();
    const raw = mpNotification(randomUUID(), "payment", String(f.provider.state.payment.id));
    const results = await Promise.all([processSandboxBillingWebhook(raw, mpSignature(raw), f.provider.adapter, now), processSandboxBillingWebhook(raw, mpSignature(raw), f.provider.adapter, now)]);
    expect(results.filter(r => "renewed" in r && r.renewed)).toHaveLength(1);
    expect(results.filter(r => "duplicate" in r && r.duplicate)).toHaveLength(1);
    const renewed = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } });
    expect(renewed.periodEnd).toEqual(end); expect(renewed.periodStart).toEqual(start);
    expect((await getCommercialEntitlementShadow(f.owner.businessId, prisma, now)).commercialAccess).toBe(true);
    expect(f.provider.state.calls).toBe(1);
  });
  it("an unrelated overlapping payment cannot extend the contract", async () => {
    const f = await setup(); await f.pay();
    const before = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } });
    f.provider.state.payment.id++; f.provider.state.invoice.payment.id = f.provider.state.payment.id;
    f.provider.state.sub.next_payment_date = new Date(+before.periodEnd! + 86_400_000).toISOString();
    f.provider.state.payment.date_last_updated = new Date().toISOString();
    await expect(f.send()).rejects.toThrow("OVERLAPPING_RENEWAL_PERIOD");
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } })).periodEnd).toEqual(before.periodEnd);
  });
  it("a rejected renewal attempt preserves previously confirmed paid access", async () => {
    const f = await setup(); await f.pay();
    f.provider.state.payment.id++; f.provider.state.invoice.payment.id = f.provider.state.payment.id;
    f.provider.state.payment.status = "rejected"; f.provider.state.payment.date_last_updated = new Date().toISOString();
    expect(await f.send()).toMatchObject({ paidPeriodPreserved: true });
    expect((await getCommercialEntitlementShadow(f.owner.businessId)).commercialAccess).toBe(true);
  });
  it("confirmed cancellation stops renewal and preserves only the canonical paid period", async () => {
    const f = await setup(); await f.pay(); const view = await loadOwnerMercadoPago(f.owner);
    expect(await cancelOwnerMercadoPago(f.owner, view.revision, false, f.provider.adapter)).toEqual({ status: "CONFIRMED" });
    const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } });
    expect(snapshot).toMatchObject({ status: "SCHEDULED_CHANGE", renewalAt: null, renewalCancellationStatus: "CONFIRMED" });
    expect((await getCommercialEntitlementShadow(f.owner.businessId)).commercialAccess).toBe(true);
    expect((await getCommercialEntitlementShadow(f.owner.businessId, prisma, snapshot.periodEnd!)).commercialAccess).toBe(false);
    expect(await cancelOwnerMercadoPago(f.owner, view.revision, false, f.provider.adapter)).toEqual({ status: "CONFIRMED" });
    expect(f.provider.state.calls).toBe(2);
  });
  it("a lost cancellation response reconciles by GET without issuing another mutation", async () => {
    const f = await setup(); await f.pay();
    const original = f.provider.port.update;
    f.provider.port.update = async (id, body) => { await original(id, body); throw new Error("fixture response lost"); };
    const adapter = new MercadoPagoSandboxAdapter(f.provider.port, 123, webhookSecret, "CONTRACT_FIXTURE");
    let view = await loadOwnerMercadoPago(f.owner);
    expect(await cancelOwnerMercadoPago(f.owner, view.revision, false, adapter)).toEqual({ status: "UNKNOWN" });
    view = await loadOwnerMercadoPago(f.owner);
    expect(view.cancellationStatus).toBe("UNKNOWN");
    expect(await cancelOwnerMercadoPago(f.owner, view.revision, true, adapter)).toEqual({ status: "CONFIRMED" });
    expect(f.provider.state.calls).toBe(2);
  });
  it("rejects stale cancellation confirmation and rechecks durable ownership", async () => {
    const f = await setup(); await f.pay(); const view = await loadOwnerMercadoPago(f.owner);
    await prisma.commercialSubscription.update({ where: { businessId: f.owner.businessId }, data: { professionalTotal: 2 } });
    await expect(cancelOwnerMercadoPago(f.owner, view.revision, false, f.provider.adapter)).rejects.toThrow("BILLING_CONTRACT_CHANGED");
    await prisma.business.update({ where: { id: f.owner.businessId }, data: { ownerId: null } });
    await expect(checkoutOwnerMercadoPago(f.owner, f.provider.adapter)).rejects.toThrow("OWNER_REQUIRED");
    expect(f.provider.state.calls).toBe(1);
  });
  it("does not cancel a remote contract with a mismatched immutable reference", async () => {
    const f = await setup(); await f.pay(); const view = await loadOwnerMercadoPago(f.owner);
    f.provider.state.sub.external_reference = "another-tenant-operation";
    expect(await cancelOwnerMercadoPago(f.owner, view.revision, false, f.provider.adapter)).toEqual({ status: "UNKNOWN" });
    expect(f.provider.state.calls).toBe(1);
  });
  it("rejects redirect hosts and paid periods spanning more than one monthly invoice", async () => {
    const f = await setup();
    Object.assign(f.provider.state.sub, { init_point: `https://attacker.invalid/subscriptions/checkout?preapproval_id=${f.provider.state.sub.id}` });
    await expect(checkoutOwnerMercadoPago(f.owner, f.provider.adapter)).rejects.toThrow("MP_CHECKOUT_URL_REJECTED");
    f.provider.state.payment.transaction_amount = COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly; f.provider.state.payment.date_last_updated = new Date().toISOString();
    f.provider.state.sub.next_payment_date = new Date(Date.now() + 90 * 86_400_000).toISOString();
    expect(await f.send()).toMatchObject({ outcome: "REJECTED" });
    expect((await getCommercialEntitlementShadow(f.owner.businessId)).commercialAccess).toBe(false);
  });
  it("activates an early verified renewal at its paid boundary without another webhook or provider request", async () => {
    const f = await setup(); await f.pay();
    const before = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } });
    const start = before.periodEnd!, end = new Date(+start + 30 * 86_400_000);
    f.provider.state.invoice.debit_date = start.toISOString(); f.provider.state.sub.next_payment_date = end.toISOString();
    f.provider.state.payment.id++; f.provider.state.invoice.payment.id = f.provider.state.payment.id;
    f.provider.state.payment.date_last_updated = new Date().toISOString();
    expect(await f.send()).toMatchObject({ scheduled: true, applied: false });
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } })).periodEnd).toEqual(start);
    expect(await reconcileReadyMercadoPagoPeriods({ businessId: f.owner.businessId, now: new Date(+start + 1), limit: 1 })).toEqual({ applied: 1, failed: 0 });
    expect(await reconcileReadyMercadoPagoPeriods({ businessId: f.owner.businessId, now: new Date(+start + 1), limit: 1 })).toEqual({ applied: 0, failed: 0 });
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: f.owner.businessId } })).periodEnd).toEqual(end);
    expect(f.provider.state.calls).toBe(1);
  });
  it("does not open a second agreement for an existing legacy billing contract", async () => {
    const f = await setup();
    await prisma.subscription.create({ data: { businessId: f.owner.businessId, mpSubscriptionId: "existing-legacy-fixture" } });
    await expect(checkoutOwnerMercadoPago(f.owner, f.provider.adapter)).rejects.toThrow("EXISTING_BILLING_CONTRACT_UNTOUCHED");
    expect(f.provider.state.calls).toBe(0);
  });
});
