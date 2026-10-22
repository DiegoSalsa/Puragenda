import { Invoice, MercadoPagoConfig, Payment, PreApproval, User } from "mercadopago";
import { z } from "zod";
import { verifyMercadoPagoWebhookSignature } from "@/server/lib/mercadopago-webhook";
import { commercialHash } from "@/server/services/commercial-internal";
import { assertProviderCurrency, assertSandboxMutation, money, providerDate, safeProviderReference, sandboxConfiguration,
  type BillingContext, type EvidenceOrigin, type ProviderPreview, type ProviderObservation, type SandboxBillingAdapter, type VerifiedNotification } from "./contracts";
export type MercadoPagoPort = {
  account(): Promise<unknown>; subscription(id: string): Promise<unknown>;
  create(body: Parameters<PreApproval["create"]>[0]["body"], key: string): Promise<unknown>;
  update(id: string, body: Parameters<PreApproval["update"]>[0]["body"]): Promise<unknown>;
  search(reference: string): Promise<unknown>; invoice(id: string): Promise<unknown>;
  invoicesForPayment(id: string): Promise<unknown>; payment(id: string): Promise<unknown>;
};
const subscriptionSchema = z.object({ id: z.string(), status: z.string(), external_reference: z.string().optional(),
  collector_id: z.number().optional(), live_mode: z.literal(false).optional(), next_payment_date: providerDate.nullish(),
  auto_recurring: z.object({ transaction_amount: money, currency_id: z.string(), frequency: z.number(), frequency_type: z.string() }),
  last_modified: providerDate.optional() });
const paymentSchema = z.object({ id: z.union([z.number(), z.string()]).transform(String), status: z.string(), live_mode: z.literal(false),
  collector_id: z.number(), currency_id: z.string(), transaction_amount: money, date_last_updated: providerDate,
  date_approved: providerDate.nullish() });
const invoiceSchema = z.object({ id: z.union([z.string(), z.number()]), preapproval_id: z.string(), debit_date: providerDate,
  payment: z.object({ id: z.union([z.string(), z.number()]).transform(String) }) });
export class MercadoPagoSandboxAdapter implements SandboxBillingAdapter {
  readonly provider = "MERCADO_PAGO" as const;
  constructor(private port: MercadoPagoPort, private accountId: number, private secret: string,
    readonly origin: EvidenceOrigin = "SANDBOX_PROVIDER", private renewalValidated = false) {}
  private async account() {
    const account = z.object({ id: z.number(), site_id: z.literal("MLC"), tags: z.array(z.string()) }).parse(await this.port.account());
    if (account.id !== this.accountId || !account.tags.includes("test_user")) throw new Error("MP_TEST_ACCOUNT_REQUIRED");
  }
  async getSubscription(id: string) {
    await this.account();
    const sub = subscriptionSchema.parse(await this.port.subscription(safeProviderReference(id)));
    if (sub.id !== id) throw new Error("PROVIDER_SUBSCRIPTION_ID_MISMATCH");
    if (sub.collector_id !== undefined && sub.collector_id !== this.accountId) throw new Error("MP_ACCOUNT_MISMATCH");
    assertProviderCurrency(sub.auto_recurring.currency_id);
    return sub;
  }
  async preview(context: BillingContext): Promise<ProviderPreview> {
    await this.account();
    const blockers: string[] = [];
    if (context.strategy === "IMMEDIATE" && context.providerSubscriptionId) blockers.push("MP_MID_CYCLE_PRORATION_UNVERIFIED");
    if (context.strategy === "NEXT_RENEWAL" && !this.renewalValidated) blockers.push("MP_RENEWAL_BOUNDARY_UNVERIFIED");
    return { supported: blockers.length === 0, blockers, currencyCode: "CLP", immediateAmountMinor: null,
      expectedPaymentMinor: context.quote.monthlyTotal, recurringAmountMinor: context.quote.monthlyTotal,
      taxAmountMinor: null, items: [], prorationMode: null, previewedAt: new Date().toISOString() };
  }
  async execute(context: BillingContext, preview: ProviderPreview, payerEmail?: string) {
    assertSandboxMutation(); await this.account();
    const currentPreview = await this.preview(context);
    if (!currentPreview.supported || !preview.supported || preview.expectedPaymentMinor !== context.quote.monthlyTotal) throw new Error("MP_POLICY_NOT_VERIFIED");
    const auto_recurring = { frequency: 1, frequency_type: "months", transaction_amount: context.quote.monthlyTotal, currency_id: "CLP" };
    let result: unknown;
    if (context.providerSubscriptionId) {
      const existing = await this.getSubscription(context.providerSubscriptionId);
      if (existing.status !== "authorized" || existing.auto_recurring.frequency !== 1 || existing.auto_recurring.frequency_type !== "months") throw new Error("MP_CONTRACT_NOT_CHANGEABLE");
      result = await this.port.update(context.providerSubscriptionId, { auto_recurring, external_reference: context.operationId });
    } else {
      if (!payerEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(payerEmail)) throw new Error("TEST_PAYER_REQUIRED");
      result = await this.port.create({ auto_recurring, external_reference: context.operationId,
        reason: "Puragenda Next sandbox", status: "pending", payer_email: payerEmail,
        back_url: "http://127.0.0.1:3000/dashboard/mi-plan" }, context.operationId);
    }
    const sub = subscriptionSchema.parse(result);
    if (sub.external_reference !== context.operationId || sub.auto_recurring.transaction_amount !== context.quote.monthlyTotal || sub.auto_recurring.currency_id !== "CLP") throw new Error("MP_RESPONSE_MISMATCH");
    return { providerSubscriptionId: sub.id, providerOperationId: sub.id, status: "AWAITING_PAYMENT" };
  }
  async findUnknown(context: BillingContext) {
    await this.account();
    const result = z.object({ results: z.array(subscriptionSchema) }).parse(await this.port.search(context.operationId));
    const matches = result.results.filter(sub => sub.external_reference === context.operationId);
    if (matches.length !== 1) return null;
    const sub = await this.getSubscription(matches[0].id);
    if (sub.auto_recurring.transaction_amount !== context.quote.monthlyTotal) return null;
    return { providerSubscriptionId: sub.id, providerOperationId: sub.id, status: "AWAITING_PAYMENT" };
  }
  async verifyNotification(rawBody: string, headers: Headers): Promise<VerifiedNotification> {
    // This identifier is untrusted until the official SDK validates its manifest.
    const untrusted = z.object({ data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }) }).parse(JSON.parse(rawBody));
    const id = headers.get("x-commercial-data-id") ?? untrusted.data.id;
    if (id !== untrusted.data.id) throw new Error("MP_SIGNED_ID_MISMATCH");
    const ts = Number(headers.get("x-signature")?.match(/(?:^|,)\s*ts=(\d+)/)?.[1]);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - (ts < 1e12 ? ts * 1000 : ts)) > 300_000) throw new Error("EXPIRED_WEBHOOK_SIGNATURE");
    const signature = verifyMercadoPagoWebhookSignature({ xSignature: headers.get("x-signature"), xRequestId: headers.get("x-request-id"), dataId: id, secret: this.secret });
    if (!signature.valid) throw new Error("INVALID_WEBHOOK_SIGNATURE");
    const payload = z.object({ id: z.union([z.string(), z.number()]).transform(String), type: z.enum(["payment", "subscription_preapproval", "subscription_authorized_payment"]), date_created: providerDate }).parse(JSON.parse(rawBody));
    return { eventId: payload.id, type: payload.type, occurredAt: payload.date_created, resourceId: safeProviderReference(id), rawHash: commercialHash(JSON.parse(rawBody)) };
  }
  async locate(notification: VerifiedNotification) {
    if (notification.type === "subscription_preapproval") {
      const sub = await this.getSubscription(notification.resourceId);
      return { operationReference: sub.external_reference ?? null, subscriptionId: sub.id, paymentId: null };
    }
    const invoices = notification.type === "subscription_authorized_payment"
      ? [invoiceSchema.parse(await this.port.invoice(notification.resourceId))]
      : z.object({ results: z.array(invoiceSchema) }).parse(await this.port.invoicesForPayment(notification.resourceId)).results;
    if (invoices.length !== 1) throw new Error("MP_INVOICE_AMBIGUOUS");
    const sub = await this.getSubscription(invoices[0].preapproval_id);
    return { operationReference: sub.external_reference ?? null, subscriptionId: sub.id, paymentId: invoices[0].payment.id };
  }
  async observe(context: BillingContext, notification: VerifiedNotification): Promise<ProviderObservation> {
    if (!context.providerSubscriptionId) throw new Error("CONTRACT_REFERENCE_NOT_RECONCILED");
    const sub = await this.getSubscription(context.providerSubscriptionId);
    const common = { provider: this.provider, origin: this.origin, providerSubscriptionId: sub.id, operationReference: sub.external_reference ?? null,
      contractMatches: sub.external_reference === context.operationId && sub.auto_recurring.transaction_amount === context.quote.monthlyTotal && sub.auto_recurring.frequency === 1 && sub.auto_recurring.frequency_type === "months",
      currencyCode: sub.auto_recurring.currency_id };
    if (notification.type === "subscription_preapproval") {
      if (notification.resourceId !== sub.id) throw new Error("MP_CONTRACT_MISMATCH");
      return { ...common, state: sub.status === "cancelled" || sub.status === "canceled" ? "CANCELLED" : "PENDING", paymentId: null,
        amountMinor: null, periodStart: null, periodEnd: null, resourceUpdatedAt: sub.last_modified ?? notification.occurredAt };
    }
    const invoice = notification.type === "subscription_authorized_payment"
      ? invoiceSchema.parse(await this.port.invoice(notification.resourceId))
      : (() => null)();
    const invoices = invoice ? [invoice] : z.object({ results: z.array(invoiceSchema) }).parse(await this.port.invoicesForPayment(notification.resourceId)).results;
    if (invoices.length !== 1 || invoices[0].preapproval_id !== sub.id) throw new Error("MP_INVOICE_BINDING_MISMATCH");
    const bound = invoices[0];
    if (notification.type === "payment" && bound.payment.id !== notification.resourceId) throw new Error("MP_PAYMENT_BINDING_MISMATCH");
    const payment = paymentSchema.parse(await this.port.payment(bound.payment.id));
    if (payment.id !== bound.payment.id) throw new Error("MP_PAYMENT_ID_MISMATCH");
    if (payment.collector_id !== this.accountId) throw new Error("MP_PAYMENT_ACCOUNT_MISMATCH");
    assertProviderCurrency(payment.currency_id);
    const state = payment.status === "approved" ? "CONFIRMED" : payment.status === "refunded" ? "REFUNDED" : payment.status === "charged_back" ? "CHARGEBACK" : ["rejected", "cancelled"].includes(payment.status) ? "REJECTED" : "PENDING";
    return { ...common, state, paymentId: payment.id, amountMinor: payment.transaction_amount, currencyCode: payment.currency_id,
      periodStart: bound.debit_date, periodEnd: sub.next_payment_date ?? null, resourceUpdatedAt: payment.date_last_updated };
  }
}
export function createMercadoPagoSandboxAdapter() {
  const { key, secret } = sandboxConfiguration("MERCADO_PAGO");
  const accountId = Number(process.env.COMMERCIAL_V2_MP_TEST_ACCOUNT_ID);
  if (!Number.isSafeInteger(accountId) || accountId <= 0) throw new Error("MP_TEST_ACCOUNT_ID_REQUIRED");
  const config = new MercadoPagoConfig({ accessToken: key, options: { timeout: 10_000 } });
  const subs = new PreApproval(config); const invoices = new Invoice(config); const payments = new Payment(config); const user = new User(config);
  return new MercadoPagoSandboxAdapter({ account: () => user.get(), subscription: id => subs.get({ id }),
    create: (body, idempotencyKey) => subs.create({ body, requestOptions: { idempotencyKey } }),
    update: (id, body) => subs.update({ id, body }), search: external_reference => subs.search({ options: { external_reference } }),
    invoice: id => invoices.get({ id }), invoicesForPayment: payment_id => invoices.search({ options: { payment_id: Number(payment_id) } }), payment: id => payments.get({ id }),
  }, accountId, secret, "SANDBOX_PROVIDER", process.env.COMMERCIAL_V2_MP_RENEWAL_VALIDATED === "1");
}
