import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createRegistrationContract } from "@/server/services/commercial-trial.service";
import type { CommercialSelection } from "@/core/commercial-selection";
import { MpV2Provider, type MpV2Port, type MpV2Subscription, type MpV2Invoice } from "@/server/commercial-billing/mercadopago-v2-provider";
import { prepareMpV2Operation, executeMpV2Operation, reconcileMpV2Invoice, reconcileMpV2Operation } from "@/server/commercial-billing/mercadopago-v2";

export const businesses: string[] = [], users: string[] = [];
export function fakeProvider(environment: "V2_SANDBOX" | "V2_PRODUCTION" = "V2_SANDBOX") {
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
export async function fixture(selection: CommercialSelection = { plan: "PURAGENDA_PLUS", professionalTotal: 1, billingCycle: "MONTHLY" }, activeTrial = false, environment: "V2_SANDBOX" | "V2_PRODUCTION" = "V2_SANDBOX") {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: "synthetic-not-a-login", name: "V2 synthetic owner" } });
  const business = await prisma.business.create({ data: { name: "V2 synthetic business", slug: randomUUID(), apiKey: randomUUID(), ownerId: user.id, countryCode: "CL", currencyCode: "CLP" } });
  users.push(user.id); businesses.push(business.id);
  const sub = await prisma.$transaction(tx => createRegistrationContract(tx, { ...selection, businessId: business.id, trialEligible: true, now: activeTrial ? new Date() : new Date(Date.now() - 40 * 86400000) }));
  const provider = fakeProvider(environment);
  const prepare = () => prepareMpV2Operation({ businessId: business.id, actorId: user.id, idempotencyKey: randomUUID(), action: "SUBSCRIBE" }, provider.provider, new Date(Date.now() - 60_000));
  return { user, business, sub, selection, ...provider, prepare };
}
export async function checkout(f: Awaited<ReturnType<typeof fixture>>) {
  const op = await f.prepare(); await executeMpV2Operation(f.business.id, op.id, "test@example.invalid", f.provider);
  return prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: op.id } });
}
export function invoiceFor(f: Awaited<ReturnType<typeof fixture>>, op: Awaited<ReturnType<typeof checkout>>, when = new Date(Date.now() - 5000), amount = op.recurringAmountMinor, status = "approved") {
  const id = randomUUID(), paymentId = randomUUID();
  const remote = f.subscriptions.get(op.providerSubscriptionId!)!; remote.status = "authorized";
  const invoice = { id, preapproval_id: remote.id, debit_date: when, currency_id: "CLP" as const, transaction_amount: amount, payment: { id: paymentId } };
  f.invoices.set(id, invoice); f.payments.set(paymentId, { id: paymentId, status, live_mode: false, collector_id: 123, currency_id: "CLP", transaction_amount: amount,
    external_reference: remote.external_reference, date_approved: status === "approved" ? when : null, date_last_updated: when });
  return invoice;
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
export async function expand(f: Fixture, plan: "PURAGENDA" | "PURAGENDA_PLUS", professionalTotal: number) {
  const op = await prepareMpV2Operation({ businessId: f.business.id, actorId: f.user.id, idempotencyKey: randomUUID(), action: "CHANGE", selection: { ...f.selection, plan, professionalTotal } }, f.provider);
  await executeMpV2Operation(f.business.id, op.id, f.user.email, f.provider);
  const id = randomUUID(), payment = { id, status: "approved", collector_id: 123, live_mode: false, currency_id: "CLP", transaction_amount: op.expectedPaymentMinor, external_reference: `v2_change_${op.id}`, date_approved: new Date(), date_last_updated: new Date() };
  f.payments.set(id, payment);
  await reconcileMpV2Operation(f.business.id, op.id, f.provider);
  return { op, payment };
}
export async function paid(cycle: "MONTHLY" | "ANNUAL" = "MONTHLY") {
  const f = await fixture({ plan: "PURAGENDA", professionalTotal: 1, billingCycle: cycle });
  const root = await checkout(f), invoice = invoiceFor(f, root);
  await reconcileMpV2Invoice(invoice, f.provider);
  return { ...f, root, invoice };
}
