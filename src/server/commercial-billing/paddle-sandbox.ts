import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { z } from "zod";
import { prepareCommercialBillingDraft } from "@/server/services/commercial-billing-adapter";
import { commercialHash } from "@/server/services/commercial-internal";
import { assertProviderCurrency, assertSandboxMutation, money, providerDate, safeProviderReference, sandboxConfiguration,
  type BillingContext, type EvidenceOrigin, type ProviderPreview, type ProviderObservation, type SandboxBillingAdapter, type VerifiedNotification } from "./contracts";
type Update = Parameters<Paddle["subscriptions"]["update"]>[1];
export type PaddlePort = {
  subscription(id: string): Promise<unknown>; price(id: string): Promise<unknown>;
  preview(id: string, payload: Update): Promise<unknown>; previewNew(items: { priceId: string; quantity: number }[]): Promise<unknown>;
  update(id: string, payload: Update): Promise<unknown>; create(payload: Parameters<Paddle["transactions"]["create"]>[0]): Promise<unknown>;
  transaction(id: string): Promise<unknown>; adjustment(id: string): Promise<unknown>;
  unmarshal(raw: string, secret: string, signature: string): Promise<unknown>;
};
const itemSchema = z.object({ price: z.object({ id: z.string() }), quantity: z.number().int().positive() });
const subSchema = z.object({ id: z.string(), status: z.string(), currencyCode: z.string(), items: z.array(itemSchema),
  customData: z.record(z.string(), z.unknown()).nullish(), scheduledChange: z.unknown().nullish(),
  currentBillingPeriod: z.object({ startsAt: providerDate, endsAt: providerDate }).nullish(), updatedAt: providerDate });
const totals = z.object({ grandTotal: money, tax: money, currencyCode: z.string() });
const details = z.object({ totals });
const transactionSchema = z.object({ id: z.string(), subscriptionId: z.string().nullable(), status: z.string(), currencyCode: z.string(),
  customData: z.record(z.string(), z.unknown()).nullish(), billingPeriod: z.object({ startsAt: providerDate, endsAt: providerDate }).nullish(),
  details: details.nullable(), updatedAt: providerDate });
export class PaddleSandboxAdapter implements SandboxBillingAdapter {
  readonly provider = "PADDLE" as const;
  constructor(private port: PaddlePort, private priceIds: Readonly<Record<string, string>>, private secret: string,
    readonly origin: EvidenceOrigin = "SANDBOX_PROVIDER", private renewalValidated = false,
    private immediateMode: NonNullable<Update["prorationBillingMode"]> = "prorated_immediately") {}
  async getSubscription(id: string) {
    const sub = subSchema.parse(await this.port.subscription(safeProviderReference(id)));
    if (sub.id !== id) throw new Error("PROVIDER_SUBSCRIPTION_ID_MISMATCH");
    assertProviderCurrency(sub.currencyCode);
    return sub;
  }
  private async targetItems(context: BillingContext) {
    const draft = prepareCommercialBillingDraft(context.quote);
    const items = [];
    for (const line of draft.lines) {
      const id = this.priceIds[line.code];
      if (!id || !/^pri_[a-z0-9]{26}$/.test(id)) throw new Error("PADDLE_V2_PRICE_NOT_CONFIGURED");
      const price = z.object({ id: z.string(), status: z.literal("active"), unitPrice: z.object({ amount: money, currencyCode: z.literal("CLP") }),
        billingCycle: z.object({ interval: z.literal("month"), frequency: z.literal(1) }), quantity: z.object({ minimum: z.number(), maximum: z.number() }) }).parse(await this.port.price(id));
      if (price.id !== id || price.unitPrice.amount !== line.unitAmountClp || line.quantity < price.quantity.minimum || line.quantity > price.quantity.maximum) throw new Error("PADDLE_PRICE_MAPPING_MISMATCH");
      items.push({ priceId: id, quantity: line.quantity });
    }
    if (context.providerSubscriptionId) {
      const sub = await this.getSubscription(context.providerSubscriptionId);
      if (sub.status === "past_due") throw new Error("PADDLE_PAST_DUE");
      if (sub.status !== "active" || sub.scheduledChange) throw new Error("PADDLE_CONTRACT_NOT_CHANGEABLE");
      if (sub.customData?.puragendaSandbox !== true) throw new Error("SANDBOX_FIXTURE_CONTRACT_REQUIRED");
      const managed = new Set(Object.values(this.priceIds));
      for (const item of sub.items) if (!managed.has(item.price.id)) items.push({ priceId: item.price.id, quantity: item.quantity });
    }
    if (new Set(items.map(item => item.priceId)).size !== items.length) throw new Error("PADDLE_DUPLICATE_ITEM");
    return items;
  }
  async preview(context: BillingContext): Promise<ProviderPreview> {
    const items = await this.targetItems(context);
    const mode = context.strategy === "NEXT_RENEWAL" ? "full_immediately" : this.immediateMode;
    const response = context.providerSubscriptionId
      ? z.object({ currencyCode: z.string(), immediateTransaction: z.object({ details }).nullish(), recurringTransactionDetails: details,
          nextTransaction: z.object({ details }).nullish() }).parse(await this.port.preview(context.providerSubscriptionId,
          { items, prorationBillingMode: mode, onPaymentFailure: "prevent_change", currencyCode: "CLP" }))
      : (() => null)();
    if (!response) {
      const initial = z.object({ currencyCode: z.string(), details }).parse(await this.port.previewNew(items));
      assertProviderCurrency(initial.currencyCode); assertProviderCurrency(initial.details.totals.currencyCode);
      return { supported: true, blockers: [], items, currencyCode: "CLP", immediateAmountMinor: initial.details.totals.grandTotal,
        expectedPaymentMinor: initial.details.totals.grandTotal, recurringAmountMinor: initial.details.totals.grandTotal,
        taxAmountMinor: initial.details.totals.tax, prorationMode: null, previewedAt: new Date().toISOString() };
    }
    assertProviderCurrency(response.currencyCode); assertProviderCurrency(response.recurringTransactionDetails.totals.currencyCode);
    const blockers = context.strategy === "NEXT_RENEWAL" && !this.renewalValidated ? ["PADDLE_RENEWAL_BOUNDARY_UNVERIFIED"] : [];
    const immediate = response.immediateTransaction?.details.totals;
    const expected = immediate ?? response.nextTransaction?.details.totals;
    return { supported: blockers.length === 0, blockers, items, currencyCode: "CLP", immediateAmountMinor: immediate?.grandTotal ?? null,
      expectedPaymentMinor: expected?.grandTotal ?? null, recurringAmountMinor: response.recurringTransactionDetails.totals.grandTotal,
      taxAmountMinor: expected?.tax ?? null, prorationMode: mode, previewedAt: new Date().toISOString() };
  }
  async execute(context: BillingContext, preview: ProviderPreview) {
    assertSandboxMutation();
    const fresh = await this.preview(context);
    if (!fresh.supported || !preview.supported || commercialHash(fresh.items) !== commercialHash(preview.items) ||
      fresh.expectedPaymentMinor !== preview.expectedPaymentMinor || fresh.taxAmountMinor !== preview.taxAmountMinor || fresh.prorationMode !== preview.prorationMode ||
      Date.now() - new Date(preview.previewedAt).getTime() > 60_000) throw new Error("PADDLE_PREVIEW_CHANGED_REAPPROVAL_REQUIRED");
    const customData = { puragendaCommercialOperation: context.operationId, puragendaBusinessId: context.businessId, puragendaSandbox: true };
    if (context.providerSubscriptionId) {
      const current = await this.getSubscription(context.providerSubscriptionId);
      const response = subSchema.parse(await this.port.update(context.providerSubscriptionId, { items: preview.items,
        customData: { ...current.customData, ...customData }, currencyCode: "CLP",
        prorationBillingMode: preview.prorationMode as NonNullable<Update["prorationBillingMode"]>, onPaymentFailure: "prevent_change" }));
      if (response.id !== context.providerSubscriptionId || response.currencyCode !== "CLP") throw new Error("PADDLE_RESPONSE_MISMATCH");
      return { providerSubscriptionId: response.id, providerOperationId: response.id, status: "AWAITING_PAYMENT" };
    }
    const response = transactionSchema.parse(await this.port.create({ items: preview.items, customData, currencyCode: "CLP", collectionMode: "automatic" }));
    if (response.currencyCode !== "CLP") throw new Error("PADDLE_RESPONSE_MISMATCH");
    return { providerSubscriptionId: response.subscriptionId, providerOperationId: response.id, status: "AWAITING_PAYMENT" };
  }
  async findUnknown(context: BillingContext) {
    if (!context.providerSubscriptionId) return null; // No safe reference lookup for a timed-out create; never create again.
    const sub = await this.getSubscription(context.providerSubscriptionId);
    if (sub.customData?.puragendaCommercialOperation !== context.operationId) return null;
    return { providerSubscriptionId: sub.id, providerOperationId: sub.id, status: "AWAITING_PAYMENT" };
  }
  async verifyNotification(rawBody: string, headers: Headers): Promise<VerifiedNotification> {
    const signature = headers.get("paddle-signature");
    if (!signature) throw new Error("INVALID_WEBHOOK_SIGNATURE");
    // Official unmarshal verifies the raw body before parsing any event.
    const event = z.object({ eventId: z.string(), eventType: z.string(), occurredAt: providerDate,
      data: z.object({ id: z.string() }) }).parse(await this.port.unmarshal(rawBody, this.secret, signature));
    return { eventId: event.eventId, type: event.eventType, occurredAt: event.occurredAt,
      resourceId: safeProviderReference(event.data.id), rawHash: commercialHash(JSON.parse(rawBody)) };
  }
  async locate(notification: VerifiedNotification) {
    if (notification.type.startsWith("subscription.")) {
      const sub = await this.getSubscription(notification.resourceId);
      return { operationReference: typeof sub.customData?.puragendaCommercialOperation === "string" ? sub.customData.puragendaCommercialOperation : null, subscriptionId: sub.id, paymentId: null };
    }
    const transactionId = notification.type.startsWith("adjustment.")
      ? z.object({ transactionId: z.string() }).parse(await this.port.adjustment(notification.resourceId)).transactionId : notification.resourceId;
    const txn = transactionSchema.parse(await this.port.transaction(transactionId));
    return { operationReference: typeof txn.customData?.puragendaCommercialOperation === "string" ? txn.customData.puragendaCommercialOperation : null,
      subscriptionId: txn.subscriptionId, paymentId: txn.id };
  }
  async observe(context: BillingContext, notification: VerifiedNotification, preview: ProviderPreview | null): Promise<ProviderObservation> {
    let transaction: z.infer<typeof transactionSchema> | null = null;
    let adjustment: { action: string; status: string; amount: number | null; updatedAt: Date } | null = null;
    if (notification.type.startsWith("transaction.")) transaction = transactionSchema.parse(await this.port.transaction(notification.resourceId));
    else if (notification.type.startsWith("adjustment.")) {
      const data = z.object({ action: z.string(), status: z.string(), transactionId: z.string(), totals: z.object({ total: money }).nullish(), updatedAt: providerDate }).parse(await this.port.adjustment(notification.resourceId));
      adjustment = { action: data.action, status: data.status, amount: data.totals?.total ?? null, updatedAt: data.updatedAt };
      transaction = transactionSchema.parse(await this.port.transaction(data.transactionId));
    } else if (!notification.type.startsWith("subscription.")) throw new Error("PADDLE_EVENT_UNSUPPORTED");
    const subId = transaction?.subscriptionId ?? context.providerSubscriptionId;
    if (!subId || (context.providerSubscriptionId && subId !== context.providerSubscriptionId)) throw new Error("PADDLE_SUBSCRIPTION_BINDING_MISMATCH");
    const sub = await this.getSubscription(subId);
    const actual = sub.items.map(item => ({ priceId: item.price.id, quantity: item.quantity })).sort((a,b) => a.priceId.localeCompare(b.priceId));
    const expected = [...(preview?.items ?? [])].sort((a,b) => a.priceId.localeCompare(b.priceId));
    const matches = expected.length > 0 && commercialHash(actual) === commercialHash(expected) && sub.customData?.puragendaCommercialOperation === context.operationId;
    const common = { provider: this.provider, origin: this.origin, providerSubscriptionId: subId,
      operationReference: typeof sub.customData?.puragendaCommercialOperation === "string" ? sub.customData.puragendaCommercialOperation : null,
      contractMatches: matches, currencyCode: sub.currencyCode };
    if (!transaction) {
      if (notification.resourceId !== subId) throw new Error("PADDLE_EVENT_BINDING_MISMATCH");
      return { ...common, state: sub.status === "canceled" ? "CANCELLED" : sub.status === "past_due" ? "REJECTED" : "PENDING",
        paymentId: null, amountMinor: null, periodStart: null, periodEnd: null, resourceUpdatedAt: sub.updatedAt };
    }
    if (notification.type.startsWith("transaction.") && transaction.id !== notification.resourceId) throw new Error("PADDLE_TRANSACTION_ID_MISMATCH");
    assertProviderCurrency(transaction.currencyCode);
    if (transaction.customData?.puragendaCommercialOperation !== context.operationId) throw new Error("PADDLE_TRANSACTION_REFERENCE_MISMATCH");
    const amountMinor = transaction.details?.totals.grandTotal ?? null;
    let state: ProviderObservation["state"] = transaction.status === "completed" ? "CONFIRMED" : ["past_due", "canceled"].includes(transaction.status) ? "REJECTED" : "PENDING";
    if (adjustment) state = adjustment.action === "chargeback" ? "CHARGEBACK" : adjustment.action === "refund" && adjustment.status === "approved" && adjustment.amount === amountMinor ? "REFUNDED" : "UNKNOWN";
    return { ...common, state, paymentId: transaction.id, amountMinor, periodStart: transaction.billingPeriod?.startsAt ?? null,
      periodEnd: transaction.billingPeriod?.endsAt ?? null, resourceUpdatedAt: adjustment?.updatedAt ?? transaction.updatedAt };
  }
}
export function createPaddleSandboxAdapter() {
  const { key, secret } = sandboxConfiguration("PADDLE");
  const priceIds = z.record(z.string(), z.string()).parse(JSON.parse(process.env.COMMERCIAL_V2_PADDLE_PRICE_MAP ?? "{}"));
  const sdk = new Paddle(key, { environment: Environment.sandbox });
  return new PaddleSandboxAdapter({ subscription: id => sdk.subscriptions.get(id), price: id => sdk.prices.get(id),
    preview: (id, body) => sdk.subscriptions.previewUpdate(id, body), previewNew: items => sdk.transactions.preview({ items, currencyCode: "CLP" }),
    update: (id, body) => sdk.subscriptions.update(id, body), create: body => sdk.transactions.create(body),
    transaction: id => sdk.transactions.get(id), adjustment: async id => {
      const matches = await sdk.adjustments.list({ id: [id] }).next();
      if (matches.length !== 1 || matches[0].id !== id) throw new Error("PADDLE_ADJUSTMENT_NOT_FOUND");
      return matches[0];
    },
    unmarshal: (raw, secret, signature) => sdk.webhooks.unmarshal(raw, secret, signature),
  }, priceIds, secret, "SANDBOX_PROVIDER", process.env.COMMERCIAL_V2_PADDLE_RENEWAL_VALIDATED === "1");
}
