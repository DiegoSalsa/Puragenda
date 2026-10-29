import { randomUUID, createHmac } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createRegistrationContract, changeCommercialTrial } from "@/server/services/commercial-trial.service";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { v2Quote, billingPeriodEnd } from "@/core/commercial-billing-policy";
import type { CommercialSelection } from "@/core/commercial-selection";
import { MpV2Provider, type MpV2Port, type MpV2Subscription, type MpV2Invoice } from "@/server/commercial-billing/mercadopago-v2-provider";
import { prepareMpV2Operation, executeMpV2Operation, reconcileMpV2Invoice, reconcileMpV2Operation, cancelMpV2Renewal, handleMpV2Webhook } from "@/server/commercial-billing/mercadopago-v2";
import { getStaffLimitInfo } from "@/server/services/staff-capacity.service";
import { runMpV2Recovery, claimMpV2Recovery, mpV2RecoveryKey } from "@/server/commercial-billing/mercadopago-v2-recovery";

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const businesses: string[] = [], users: string[] = [];
function fakeProvider(environment: "V2_SANDBOX" | "V2_PRODUCTION" = "V2_SANDBOX") {
  const subscriptions = new Map<string, MpV2Subscription>(), invoices = new Map<string, MpV2Invoice>(), payments = new Map<string, Record<string, unknown>>();
  const port: MpV2Port = {
    account: vi.fn(async () => ({ id: 123, site_id: "MLC", tags: environment === "V2_SANDBOX" ? ["test_user"] : [] })),
    subscription: vi.fn(async id => subscriptions.get(id)),
    create: vi.fn(async body => {
      const id = randomUUID(), value = { id, collector_id: 123, application_id: 456, status: "pending", external_reference: body.external_reference!, live_mode: environment === "V2_PRODUCTION",
        auto_recurring: { ...body.auto_recurring!, start_date: body.auto_recurring?.start_date ? new Date(body.auto_recurring.start_date) : new Date() }, init_point: `https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${id}` } as MpV2Subscription;
      subscriptions.set(id, value); return value;
    }),
    update: vi.fn(async (id, body) => { const current = subscriptions.get(id)!; const updated = { ...current, ...(body.status ? { status: body.status } : {}), auto_recurring: { ...current.auto_recurring, ...body.auto_recurring } } as MpV2Subscription; subscriptions.set(id, updated); return updated; }),
    search: async reference => ({ results: [...subscriptions.values()].filter(row => row.external_reference === reference) }),
    invoice: async id => invoices.get(id), invoices: async id => ({ results: [...invoices.values()].filter(row => row.preapproval_id === id) }),
    invoicesForPayment: async id => ({ results: [...invoices.values()].filter(row => row.payment?.id === id) }), payment: async id => payments.get(id),
    preference: vi.fn(async () => ({ id: randomUUID(), init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=synthetic" })),
    payments: async reference => ({ results: [...payments.values()].filter(row => row.external_reference === reference) }),
  };
  const provider = new MpV2Provider({ environment, accountId: 123, applicationId: 456, token: "synthetic-test-only", secret: "synthetic-test-secret", returnUrl: "http://127.0.0.1:3012/dashboard/settings", webhookUrl: "https://example.invalid/webhook" }, port);
  return { provider, port, subscriptions, invoices, payments };
}
async function fixture(selection: CommercialSelection = { plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "MONTHLY" }, activeTrial = false, environment: "V2_SANDBOX" | "V2_PRODUCTION" = "V2_SANDBOX") {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: "synthetic-not-a-login", name: "V2 synthetic owner" } });
  const business = await prisma.business.create({ data: { name: "V2 synthetic business", slug: randomUUID(), apiKey: randomUUID(), ownerId: user.id, countryCode: "CL", currencyCode: "CLP" } });
  users.push(user.id); businesses.push(business.id);
  const sub = await prisma.$transaction(tx => createRegistrationContract(tx, { ...selection, businessId: business.id, trialEligible: true, now: activeTrial ? new Date() : new Date(Date.now() - 40 * 86400000) }));
  const provider = fakeProvider(environment);
  const prepare = () => prepareMpV2Operation({ businessId: business.id, actorId: user.id, idempotencyKey: randomUUID(), action: "SUBSCRIBE" }, provider.provider, new Date(Date.now() - 60_000));
  return { user, business, sub, selection, ...provider, prepare };
}
async function checkout(f: Awaited<ReturnType<typeof fixture>>) {
  const op = await f.prepare(); await executeMpV2Operation(f.business.id, op.id, "test@example.invalid", f.provider);
  return prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } });
}
function invoiceFor(f: Awaited<ReturnType<typeof fixture>>, op: Awaited<ReturnType<typeof checkout>>, when = new Date(Date.now() - 5000), amount = op.recurringAmountMinor, status = "approved") {
  const id = randomUUID(), paymentId = randomUUID();
  const remote = f.subscriptions.get(op.providerSubscriptionId!)!; remote.status = "authorized";
  const invoice = { id, preapproval_id: remote.id, debit_date: when, currency_id: "CLP" as const, transaction_amount: amount, payment: { id: paymentId } };
  f.invoices.set(id, invoice); f.payments.set(paymentId, { id: paymentId, status, live_mode: false, collector_id: 123, currency_id: "CLP", transaction_amount: amount,
    external_reference: remote.external_reference, date_approved: status === "approved" ? when : null, date_last_updated: when });
  return invoice;
}
suite("Mercado Pago V2 runtime against isolated PostgreSQL (provider mocked)", () => {
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => { await prisma.business.deleteMany({ where: { id: { in: businesses } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("contracts %s with all seat/period combinations and reconciles without a browser grant", async plan => {
    for (const professionalTotal of [1, 2, 5, 20]) for (const billingCycle of ["MONTHLY", "ANNUAL"] as const) {
      const f = await fixture({ plan, professionalTotal, billingCycle }), op = await checkout(f);
      expect(op.status).toBe("AWAITING_PAYMENT"); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
      expect(f.subscriptions.get(op.providerSubscriptionId!)!.auto_recurring).toMatchObject({ frequency: billingCycle === "ANNUAL" ? 12 : 1, transaction_amount: v2Quote(f.selection).cycleTotal, currency_id: "CLP" });
      const invoice = invoiceFor(f, op);
      await reconcileMpV2Invoice(invoice, f.provider);
      const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
      expect(sub).toMatchObject({ status: "ACTIVE", planCode: plan, professionalTotal, billingCycle, lastPaymentStatus: "CONFIRMED", totalPriceClp: v2Quote(f.selection).cycleTotal });
      expect(sub.periodEnd).toEqual(billingPeriodEnd(invoice.debit_date, billingCycle, op.effectiveAt.getUTCDate()));
      expect((await getCommercialPlanAccess(f.business.id)).has("contact_flow")).toBe(plan === "PURAGENDA_PLUS");
      expect((await getCommercialPlanAccess(f.business.id)).professionalTotal).toBe(professionalTotal);
      expect(await prisma.subscription.findUnique({ where: { businessId: f.business.id } })).toMatchObject({ plan, billingCycle, status: "ACTIVE", isTrial: false, staffLimitOverride: professionalTotal });
    }
  });
  it("preserves the entire trial and freezes its selection while authorization is open", async () => {
    const f = await fixture(undefined, true), op = await checkout(f);
    expect(f.subscriptions.get(op.providerSubscriptionId!)!.auto_recurring.start_date).toEqual(f.sub.trialEnd);
    expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(true);
    await expect(changeCommercialTrial({ businessId: f.business.id, actorId: f.user.id, idempotencyKey: randomUUID(), ...f.selection, professionalTotal: 2 })).rejects.toThrow("V2_OPERATION_ALREADY_OPEN");
    const unchanged = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    expect(unchanged.trialEnd).toEqual(f.sub.trialEnd); expect(unchanged.lastPaymentAt).toBeNull();
    await expect(reconcileMpV2Invoice(invoiceFor(f, op), f.provider)).rejects.toThrow("V2_PAYMENT_PERIOD_MISMATCH");
  });
  it("coalesces double clicks, detects changed idempotent inputs and sends one remote create", async () => {
    const f = await fixture(); const [a, b] = await Promise.all([f.prepare(), f.prepare()]); expect(a.id).toBe(b.id);
    await Promise.all([executeMpV2Operation(f.business.id, a.id, f.user.email, f.provider), executeMpV2Operation(f.business.id, a.id, f.user.email, f.provider)]);
    expect(f.port.create).toHaveBeenCalledTimes(1);
    await expect(prepareMpV2Operation({ businessId: f.business.id, actorId: randomUUID(), action: "SUBSCRIBE", idempotencyKey: randomUUID() }, f.provider)).rejects.toThrow("OWNER_REQUIRED");
  });
  it("recovers a timeout after remote creation without creating another subscription", async () => {
    const f = await fixture(), original = f.port.create;
    f.port.create = vi.fn(async (body, key) => { await original(body, key); throw new Error("timeout after success"); });
    const op = await checkout(f); expect(op.status).toBe("UNKNOWN");
    const recovered = await reconcileMpV2Operation(f.business.id, op.id, f.provider);
    expect(recovered.status).toBe("AWAITING_PAYMENT"); expect(recovered.checkoutUrl).toContain("preapproval_id="); expect(f.port.create).toHaveBeenCalledTimes(1);
  });
  it("keeps an ambiguous provider failure UNKNOWN and never blindly retries a POST", async () => {
    const f = await fixture(); f.port.create = vi.fn(async () => { throw new Error("network"); }); const op = await checkout(f);
    await executeMpV2Operation(f.business.id, op.id, f.user.email, f.provider); await reconcileMpV2Operation(f.business.id, op.id, f.provider);
    expect(f.port.create).toHaveBeenCalledTimes(1); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  it("records pending/rejected evidence and grants only canonical approval, idempotently", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op, undefined, undefined, "pending");
    await reconcileMpV2Invoice(invoice, f.provider); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    f.payments.get(invoice.payment.id)!.status = "rejected"; await reconcileMpV2Invoice(invoice, f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    Object.assign(f.payments.get(invoice.payment.id)!, { status: "approved", date_approved: invoice.debit_date });
    await Promise.all([reconcileMpV2Invoice(invoice, f.provider), reconcileMpV2Invoice(invoice, f.provider)]);
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(1);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
  });
  it("rejects wrong amounts, currencies, live mode, IDs and cross-business operations", async () => {
    const f = await fixture(), foreign = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op);
    await expect(reconcileMpV2Operation(foreign.business.id, op.id, f.provider)).rejects.toThrow("V2_OPERATION_NOT_FOUND");
    const payment = f.payments.get(invoice.payment.id)!;
    payment.live_mode = true; await expect(reconcileMpV2Invoice(invoice, f.provider)).rejects.toThrow(); payment.live_mode = false;
    payment.currency_id = "USD"; await expect(reconcileMpV2Invoice(invoice, f.provider)).rejects.toThrow(); payment.currency_id = "CLP";
    payment.transaction_amount = op.recurringAmountMinor + 1; await expect(reconcileMpV2Invoice(invoice, f.provider)).rejects.toThrow("V2_PAYMENT_AMOUNT_MISMATCH");
    payment.transaction_amount = op.recurringAmountMinor; payment.external_reference = "foreign";
    await expect(reconcileMpV2Invoice(invoice, f.provider)).rejects.toThrow("V2_PAYMENT_BINDING_MISMATCH");
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  it("reconciles renewal and ignores older invoices without shortening the current period", async () => {
    const f = await fixture(), op = await checkout(f), first = invoiceFor(f, op);
    await reconcileMpV2Invoice(first, f.provider);
    const start = billingPeriodEnd(first.debit_date, f.selection.billingCycle, op.effectiveAt.getUTCDate()), second = invoiceFor(f, op, start);
    const now = new Date(+start + 60_000); await reconcileMpV2Invoice(second, f.provider, now); await reconcileMpV2Invoice(first, f.provider, now);
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } }); expect(sub.periodStart).toEqual(start);
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(2);
    expect((await getCommercialPlanAccess(f.business.id, now)).allowed).toBe(true);
  });
  it("cancels only future charges and preserves paid access and customer data", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op); await reconcileMpV2Invoice(invoice, f.provider);
    const client = await prisma.client.create({ data: { businessId: f.business.id, name: "Synthetic retained client", email: "retained@example.invalid" } });
    await cancelMpV2Renewal(f.business.id, f.user.id, f.provider); await cancelMpV2Renewal(f.business.id, f.user.id, f.provider);
    expect(f.port.update).toHaveBeenCalledTimes(1); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    expect(sub.renewalCancellationStatus).toBe("CANCELLED_VERIFIED"); expect(sub.renewalAt).toBeNull(); expect(await prisma.client.findUnique({ where: { id: client.id } })).toBeTruthy();
    expect((await getCommercialPlanAccess(f.business.id, sub.periodEnd!)).allowed).toBe(false);
  });
  it("charges an expansion separately and updates the same recurring subscription only after approval", async () => {
    const f = await fixture({ plan: "PURAGENDA", professionalTotal: 1, billingCycle: "ANNUAL" }), initial = await checkout(f); await reconcileMpV2Invoice(invoiceFor(f, initial), f.provider);
    const op = await prepareMpV2Operation({ businessId: f.business.id, actorId: f.user.id, idempotencyKey: randomUUID(), action: "CHANGE", selection: { ...f.selection, plan: "PURAGENDA_PLUS", professionalTotal: 5 } }, f.provider);
    await executeMpV2Operation(f.business.id, op.id, f.user.email, f.provider); expect(f.port.update).not.toHaveBeenCalled();
    expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(false);
    const paymentId = randomUUID(); f.payments.set(paymentId, { id: paymentId, status: "approved", live_mode: false, collector_id: 123, currency_id: "CLP", transaction_amount: op.expectedPaymentMinor,
      external_reference: `v2_change_${op.id}`, date_approved: new Date(), date_last_updated: new Date() });
    await reconcileMpV2Operation(f.business.id, op.id, f.provider); await reconcileMpV2Operation(f.business.id, op.id, f.provider);
    expect(f.port.update).toHaveBeenCalledTimes(1); expect(f.port.create).toHaveBeenCalledTimes(1);
    expect((await getCommercialPlanAccess(f.business.id)).professionalTotal).toBe(5); expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(true);
    expect(f.subscriptions.get(initial.providerSubscriptionId!)!.auto_recurring.transaction_amount).toBe(v2Quote({ ...f.selection, plan: "PURAGENDA_PLUS", professionalTotal: 5 }).cycleTotal);
  });
  it("keeps reductions scheduled until the corresponding new renewal payment", async () => {
    const f = await fixture({ plan: "PURAGENDA_PLUS", professionalTotal: 5, billingCycle: "MONTHLY" }), initial = await checkout(f), first = invoiceFor(f, initial); await reconcileMpV2Invoice(first, f.provider);
    const op = await prepareMpV2Operation({ businessId: f.business.id, actorId: f.user.id, idempotencyKey: randomUUID(), action: "CHANGE", selection: { ...f.selection, plan: "PURAGENDA", professionalTotal: 2 } }, f.provider);
    const result = await executeMpV2Operation(f.business.id, op.id, f.user.email, f.provider); expect(result.status).toBe("SCHEDULED");
    expect((await getCommercialPlanAccess(f.business.id)).professionalTotal).toBe(5); expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(true);
    expect((await getStaffLimitInfo(f.business.id)).maxAllowed).toBe(2);
    const next = invoiceFor(f, initial, op.effectiveAt, op.recurringAmountMinor); await reconcileMpV2Invoice(next, f.provider, new Date(+op.effectiveAt + 60_000));
    expect((await getCommercialPlanAccess(f.business.id, op.effectiveAt)).professionalTotal).toBe(2);
    expect((await getCommercialPlanAccess(f.business.id, op.effectiveAt)).has("puri.plus")).toBe(false);
  });
  it("accepts signed duplicate/out-of-order notifications and rejects tampering before provider IO", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op);
    const raw = JSON.stringify({ id: randomUUID(), type: "subscription_authorized_payment", data: { id: invoice.id }, live_mode: false });
    const ts = String(Math.floor(Date.now() / 1000)), req = randomUUID(), signature = createHmac("sha256", f.provider.config.secret).update(`id:${invoice.id};request-id:${req};ts:${ts};`).digest("hex");
    const headers = new Headers({ "x-request-id": req, "x-signature": `ts=${ts},v1=${signature}` });
    await handleMpV2Webhook(raw, headers, invoice.id, f.provider); await handleMpV2Webhook(raw, headers, invoice.id, f.provider);
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(1);
    vi.mocked(f.port.account).mockClear();
    await expect(handleMpV2Webhook(raw.replace(invoice.id, "forged"), headers, invoice.id, f.provider)).rejects.toThrow("V2_INVALID_WEBHOOK_SIGNATURE");
    expect(f.port.account).not.toHaveBeenCalled();
    f.payments.get(invoice.payment.id)!.status = "pending";
    await reconcileMpV2Invoice(invoice, f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    f.payments.get(invoice.payment.id)!.status = "refunded";
    await reconcileMpV2Invoice(invoice, f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    f.payments.get(invoice.payment.id)!.status = "approved";
    await reconcileMpV2Invoice(invoice, f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  it("recovers cancellation after a provider timeout and never shortens the paid period", async () => {
    const f = await fixture(), op = await checkout(f); await reconcileMpV2Invoice(invoiceFor(f, op), f.provider);
    const original = f.port.update;
    f.port.update = vi.fn(async (id, body) => { await original(id, body); throw new Error("timeout after cancellation"); });
    const cancellation = await cancelMpV2Renewal(f.business.id, f.user.id, f.provider);
    expect(cancellation.status).toBe("UNKNOWN");
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    expect((await reconcileMpV2Operation(f.business.id, cancellation.operationId, f.provider)).status).toBe("APPLIED");
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } })).renewalCancellationStatus).toBe("CANCELLED_VERIFIED");
    expect(f.port.update).toHaveBeenCalledTimes(1);
  });
  it("resumes persisted preparation after a process interruption without a second consent or duplicate POST", async () => {
    const f = await fixture(), op = await f.prepare();
    const view = await reconcileMpV2Operation(f.business.id, op.id, f.provider);
    expect(view.status).toBe("AWAITING_PAYMENT"); expect(f.port.create).toHaveBeenCalledTimes(1);
    expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_consent" } })).toBe(1);
  });
  it("does not overwrite a new contract selection accepted in another tab", async () => {
    const f = await fixture(undefined, true), before = f.sub.snapshotHash;
    await changeCommercialTrial({ ...f.selection, professionalTotal: 2, businessId: f.business.id, actorId: f.user.id, idempotencyKey: randomUUID() });
    await expect(prepareMpV2Operation({ businessId: f.business.id, actorId: f.user.id, action: "SUBSCRIBE", idempotencyKey: randomUUID(), expectedContractHash: before }, f.provider)).rejects.toThrow("V2_CONTRACT_CHANGED");
    expect(f.port.create).not.toHaveBeenCalled();
  });
  it("refuses legacy/manual contracts and leaves their original billing data untouched", async () => {
    const f = await fixture();
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: "EQUIPO", paymentMethod: "BANK_TRANSFER", customMonthlyPriceClp: 24000 } });
    const before = await prisma.subscription.findUniqueOrThrow({ where: { businessId: f.business.id } });
    await expect(f.prepare()).rejects.toThrow("V2_REGISTRATION_CONTRACT_REQUIRED");
    expect(await prisma.subscription.findUnique({ where: { businessId: f.business.id } })).toEqual(before); expect(f.port.create).not.toHaveBeenCalled();
  });
  const recover = (f: Awaited<ReturnType<typeof fixture>>, options: Parameters<typeof runMpV2Recovery>[1] = {}) => {
    vi.stubEnv("PURAGENDA_MP_V2_RECOVERY_ENABLED", "1");
    vi.stubEnv("PURAGENDA_MP_V2_ENVIRONMENT", "sandbox");
    return runMpV2Recovery(f.provider, { businessId: f.business.id, minimumIntervalMs: 0, ...options });
  };
  it("recovers a lost payment webhook and discovers cancellation/refund before renewal is due", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op);
    expect((await recover(f)).confirmed).toBe(1);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    await recover(f);
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(1);
    f.subscriptions.get(op.providerSubscriptionId!)!.status = "cancelled";
    await recover(f);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } })).renewalCancellationStatus).toBe("CANCELLED_VERIFIED");
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    f.payments.get(invoice.payment.id)!.status = "refunded";
    await recover(f);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  it.each(["MONTHLY", "ANNUAL"] as const)("recovers an unnotified %s renewal from canonical invoices", async billingCycle => {
    const f = await fixture({ plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle }), op = await checkout(f);
    const old = new Date(Date.now() - (billingCycle === "ANNUAL" ? 366 : 32) * 86400_000);
    await prisma.commercialBillingOperation.update({ where: { id: op.id }, data: { effectiveAt: new Date(+old - 1000) } });
    const first = invoiceFor(f, op, old); await reconcileMpV2Invoice(first, f.provider);
    const current = invoiceFor(f, op, new Date(Date.now() - 5000));
    expect((await recover(f)).failed).toBe(0);
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    expect(sub.lastPaymentStatus).toBe("CONFIRMED"); expect(sub.periodStart).toEqual(current.debit_date);
    expect(sub.periodEnd).toEqual(billingPeriodEnd(current.debit_date, billingCycle, old.getUTCDate()));
  });
  it("recovers UNKNOWN by canonical search without repeating a subscription POST", async () => {
    const f = await fixture(), original = f.port.create;
    f.port.create = vi.fn(async (body, key) => { await original(body, key); throw Error("timeout"); });
    const op = await checkout(f); expect(op.status).toBe("UNKNOWN");
    expect((await recover(f)).failed).toBe(0);
    expect((await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } })).providerSubscriptionId).toBeTruthy();
    expect(f.port.create).toHaveBeenCalledTimes(1);
  });
  it("polls pending and rejected canonical charges without granting paid access", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op, undefined, undefined, "pending");
    expect((await recover(f)).pending).toBe(1); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    f.payments.get(invoice.payment.id)!.status = "rejected";
    expect((await recover(f)).rejected).toBe(1); expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
  });
  it("resumes a durable invoice offset when a request budget ends halfway through a page", async () => {
    const f = await fixture(), op = await checkout(f);
    const rows = [7, 6, 5].map(seconds => invoiceFor(f, op, new Date(Date.now() - seconds * 1000)));
    f.port.invoices = vi.fn(async (_id, offset = 0) => ({ results: rows.slice(offset), paging: { total: rows.length } }));
    expect((await recover(f, { maxRequests: 6 })).exhausted).toBe(true);
    expect((await prisma.commercialWorkerState.findUniqueOrThrow({ where: { key: `MP_V2_RECOVERY_OPERATION:${op.id}` } })).cursor).toBe("1");
    expect((await recover(f)).failed).toBe(0);
    expect(vi.mocked(f.port.invoices).mock.calls[1][1]).toBe(1);
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(3);
    expect((await prisma.commercialWorkerState.findUniqueOrThrow({ where: { key: `MP_V2_RECOVERY_OPERATION:${op.id}` } })).cursor).toBe("0");
  });
  it("persists monetary alerts once per day, resolves them after correction and sanitizes repeated errors", async () => {
    const f = await fixture(), op = await checkout(f), invoice = invoiceFor(f, op);
    f.payments.get(invoice.payment.id)!.transaction_amount = op.recurringAmountMinor + 1;
    expect((await recover(f)).monetaryMismatches).toBe(1); await recover(f);
    expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_recovery_alert", outcome: "UNKNOWN" } })).toBe(1);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    f.payments.get(invoice.payment.id)!.transaction_amount = op.recurringAmountMinor;
    await recover(f);
    expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_recovery_alert", outcome: "UNKNOWN" } })).toBe(0);
    f.port.subscription = vi.fn(async () => { throw Error("sensitive-provider-message-must-not-be-stored"); });
    await recover(f); await recover(f); expect((await recover(f)).alerts).toBe(1);
    const alert = await prisma.commercialEvent.findFirstOrThrow({ where: { businessId: f.business.id, operation: "V2_RECOVERY_REPEATED_FAILURE" } });
    expect(JSON.stringify(alert)).not.toContain("sensitive-provider-message");
  });
  it("alerts on overdue operations without treating a future free-trial charge as overdue", async () => {
    const f = await fixture(), op = await checkout(f), past = new Date(Date.now() - 3 * 86400_000);
    await prisma.commercialBillingOperation.update({ where: { id: op.id }, data: { createdAt: past, effectiveAt: past } });
    expect((await recover(f)).stale).toBe(1);
    const trial = await fixture(undefined, true), authorized = await checkout(trial);
    await prisma.commercialBillingOperation.update({ where: { id: authorized.id }, data: { createdAt: past } });
    expect((await recover(trial)).stale).toBe(0);
    expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: trial.sub.id } })).lastPaymentAt).toBeNull();
  });
  it("allows only one concurrent recovery and fences an expired runner's progress", async () => {
    const f = await fixture(), op = await checkout(f); invoiceFor(f, op);
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    f.port.account = vi.fn(async () => { await gate; return { id: 123, site_id: "MLC", tags: ["test_user"] }; });
    const a = recover(f), b = recover(f);
    expect(await Promise.race([a, b])).toMatchObject({ busy: true }); release();
    const results = await Promise.all([a, b]); expect(results.filter(r => r.completed === 1)).toHaveLength(1);
    const old = await claimMpV2Recovery(f.provider); expect(old).toBeTruthy();
    await prisma.commercialWorkerState.update({ where: { key: old!.key }, data: { leaseUntil: new Date(Date.now() - 1) } });
    const current = await claimMpV2Recovery(f.provider); expect(current!.fence).toBe(old!.fence + 1);
    expect((await prisma.commercialWorkerState.updateMany({ where: { key: old!.key, fence: old!.fence, leaseOwner: old!.leaseOwner }, data: { cursor: "stale" } })).count).toBe(0);
    await prisma.commercialWorkerState.update({ where: { key: mpV2RecoveryKey(f.provider) }, data: { leaseOwner: null, leaseUntil: null } });
  });
  it("excludes legacy contracts before provider IO and blocks production even with recovery enabled", async () => {
    const f = await fixture(), op = await checkout(f);
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: "EQUIPO", paymentMethod: "BANK_TRANSFER" } });
    vi.mocked(f.port.account).mockClear(); const before = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } });
    expect((await recover(f)).completed).toBe(0); expect(f.port.account).not.toHaveBeenCalled();
    expect(await prisma.commercialBillingOperation.findUnique({ where: { id: op.id } })).toEqual(before);
    await expect(recover({ ...f, provider: new MpV2Provider({ ...f.provider.config, environment: "V2_PRODUCTION" }, f.port) })).rejects.toThrow("V2_RECOVERY_SANDBOX_REQUIRED");
    vi.stubEnv("VERCEL_ENV", "production"); await expect(recover(f)).rejects.toThrow("V2_RECOVERY_SANDBOX_REQUIRED");
  });
  it("recovers production V2 money only behind the additional production release guards", async () => {
    const f = await fixture(undefined, false, "V2_PRODUCTION"), op = await checkout(f), invoice = invoiceFor(f, op);
    const payment = f.payments.get(String(invoice.payment!.id))!; payment.live_mode = true;
    vi.stubEnv("PURAGENDA_MP_V2_RECOVERY_ENABLED", "1");
    await expect(runMpV2Recovery(f.provider)).rejects.toThrow("V2_RECOVERY_SANDBOX_REQUIRED");
    for (const [name, value] of Object.entries({ NODE_ENV: "production", VERCEL_ENV: "production", PURAGENDA_NEXT_ENABLED: "1", PURAGENDA_MP_V2_ENABLED: "1", PURAGENDA_MP_V2_ENVIRONMENT: "production", PURAGENDA_MP_V2_PRODUCTION_WRITES: "1", PURAGENDA_MP_V2_PRODUCTION_RECOVERY_ENABLED: "1" })) vi.stubEnv(name, value);
    expect((await runMpV2Recovery(f.provider, { businessId: f.business.id, minimumIntervalMs: 0 })).confirmed).toBe(1);
    await runMpV2Recovery(f.provider, { businessId: f.business.id, minimumIntervalMs: 0 });
    expect(await prisma.commercialPaymentEvidence.count({ where: { operationId: op.id } })).toBe(1);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    expect(f.port.create).toHaveBeenCalledTimes(1);
  });
});
