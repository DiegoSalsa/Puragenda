import { z } from "zod";
import type { CommercialBillingOperation, CommercialSubscription, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash, assertNoOpenCommercialMigration } from "@/server/services/commercial-internal";
import { commercialJson, materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import { commercialSelectionSchema, type CommercialSelection } from "@/server/services/commercial-trial.service";
import { isV2Plan } from "@/server/services/commercial-plan-access";
import { billingPeriodEnd, changeTiming, expansionAmount, includedVat, v2Quote, V2_OPEN_STATUSES } from "@/core/commercial-billing-policy";
import { createMpV2Provider, MpV2Provider, mpV2InvoiceSchema, type MpV2Invoice, type MpV2Subscription } from "./mercadopago-v2-provider";

const savedQuote = z.object({ selection: commercialSelectionSchema, quote: z.unknown(),
  acceptedAt: z.coerce.date(), actorId: z.string(), periodStart: z.coerce.date().optional(), periodEnd: z.coerce.date().optional(), previousSelection: commercialSelectionSchema.optional() });
const rootReference = (id: string) => `v2_${id}`;
const changeReference = (id: string) => `v2_change_${id}`;
function selectionOf(sub: CommercialSubscription): CommercialSelection {
  return commercialSelectionSchema.parse({ plan: sub.planCode, professionalTotal: sub.professionalTotal, billingCycle: sub.billingCycle });
}
function quoteOf(op: CommercialBillingOperation) {
  const saved = savedQuote.parse(op.quoteSnapshot), quote = v2Quote(saved.selection);
  if (commercialHash(quote) !== commercialHash(saved.quote) || quote.cycleTotal !== op.recurringAmountMinor || saved.selection.plan !== op.targetPlanCode || saved.selection.professionalTotal !== op.targetProfessionalTotal) throw new Error("V2_OPERATION_QUOTE_MISMATCH");
  return { ...saved, quote };
}
async function lock(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
}
async function runtimeContract(tx: Prisma.TransactionClient, businessId: string, actorId?: string) {
  const business = await tx.business.findFirst({ where: { id: businessId, deletedAt: null, ...(actorId ? { ownerId: actorId } : {}), owner: { deletedAt: null } }, include: { subscription: true, commercialSubscription: true } });
  if (!business) throw new Error("OWNER_REQUIRED");
  const sub = business.commercialSubscription;
  if (!sub || !isV2Plan(sub.planCode) || !isV2Plan(business.subscription?.plan) || sub.legacySubscriptionId ||
    (sub.termsSnapshot as { origin?: string })?.origin !== "registration_v2" || business.subscription?.mpSubscriptionId || business.subscription?.paddleSubscriptionId || business.subscription?.paymentMethod === "BANK_TRANSFER") throw new Error("V2_REGISTRATION_CONTRACT_REQUIRED");
  if (business.countryCode !== "CL" || business.currencyCode !== "CLP") throw new Error("V2_CHILE_CLP_REQUIRED");
  await assertNoOpenCommercialMigration(tx, businessId);
  return { business, sub };
}
async function ownedOperation(businessId: string, id: string, provider: MpV2Provider) {
  const op = await prisma.commercialBillingOperation.findFirst({ where: { id, businessId, provider: "MERCADO_PAGO", environment: provider.config.environment } });
  if (!op) throw new Error("V2_OPERATION_NOT_FOUND");
  quoteOf(op);
  return op;
}
function assertBinding(sub: MpV2Subscription, root: CommercialBillingOperation) {
  if (sub.id !== root.providerSubscriptionId || sub.external_reference !== rootReference(root.id)) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
}
async function subscriptionRoot(sub: MpV2Subscription, provider: MpV2Provider) {
  if (!sub.external_reference.startsWith("v2_") || sub.external_reference.startsWith("v2_change_")) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
  const op = await prisma.commercialBillingOperation.findFirst({ where: { id: sub.external_reference.slice(3), environment: provider.config.environment, kind: "NEW_SUBSCRIPTION", provider: "MERCADO_PAGO" } });
  if (!op) throw new Error("V2_OPERATION_NOT_FOUND");
  if (op.providerSubscriptionId && op.providerSubscriptionId !== sub.id) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
  const saved = quoteOf(op);
  if (op.effectiveAt > new Date() && (!sub.auto_recurring.start_date || Math.abs(+sub.auto_recurring.start_date - +op.effectiveAt) > 1000)) throw new Error("V2_TRIAL_FIRST_CHARGE_UNVERIFIED");
  if (!op.providerSubscriptionId) {
    // A webhook may arrive between the remote POST and its local response write.
    if (!["EXECUTING", "UNKNOWN"].includes(op.status)) throw new Error("V2_OPERATION_NOT_EXECUTED");
    if (sub.auto_recurring.transaction_amount !== saved.quote.cycleTotal || sub.auto_recurring.frequency !== (saved.selection.billingCycle === "ANNUAL" ? 12 : 1)) throw new Error("V2_PROVIDER_QUOTE_MISMATCH");
    await prisma.$transaction(async tx => { await lock(tx, op.businessId); await runtimeContract(tx, op.businessId);
      await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { providerSubscriptionId: sub.id, providerOperationId: sub.id, status: "AWAITING_PAYMENT" } });
      await tx.commercialSubscription.update({ where: { id: op.subscriptionId }, data: { provider: "MERCADO_PAGO", externalSubscriptionId: sub.id, externalReference: rootReference(op.id) } });
    });
  }
  return { ...op, providerSubscriptionId: sub.id };
}

export async function prepareMpV2Operation(input: { businessId: string; actorId: string; idempotencyKey: string; action: "SUBSCRIBE" | "CHANGE"; selection?: CommercialSelection; expectedContractHash?: string }, provider = createMpV2Provider(), now = new Date()) {
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(input.idempotencyKey)) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  return prisma.$transaction(async tx => {
    await lock(tx, input.businessId);
    const { sub } = await runtimeContract(tx, input.businessId, input.actorId);
    const selection = input.action === "SUBSCRIBE" ? selectionOf(sub) : commercialSelectionSchema.parse(input.selection);
    const quote = v2Quote(selection), inputHash = commercialHash({ action: input.action, selection });
    const key = `mp-v2:${input.businessId}:${input.idempotencyKey}`;
    const previous = await tx.commercialBillingOperation.findUnique({ where: { idempotencyKey: key } });
    if (previous) { if (previous.inputHash !== inputHash || previous.environment !== provider.config.environment) throw new Error("IDEMPOTENCY_CONFLICT"); return previous; }
    if (input.expectedContractHash && input.expectedContractHash !== sub.snapshotHash) throw new Error("V2_CONTRACT_CHANGED");
    if (sub.renewalCancellationStatus && sub.renewalCancellationStatus !== "CANCELLED_VERIFIED") throw new Error("V2_CANCELLATION_PENDING");
    const open = await tx.commercialBillingOperation.findFirst({ where: { businessId: input.businessId, kind: { not: "CANCEL_RENEWAL" }, status: { in: V2_OPEN_STATUSES } } });
    if (open) { if (open.inputHash === inputHash && open.environment === provider.config.environment) return open; throw new Error("V2_OPERATION_ALREADY_OPEN"); }
    if (sub.externalSubscriptionId) {
      const root = await tx.commercialBillingOperation.findFirst({ where: { subscriptionId: sub.id, providerSubscriptionId: sub.externalSubscriptionId, kind: "NEW_SUBSCRIPTION", environment: provider.config.environment } });
      if (!root) throw new Error("V2_ENVIRONMENT_MISMATCH");
    }
    let strategy: "IMMEDIATE" | "NEXT_RENEWAL" = "IMMEDIATE", effectiveAt = now, expectedPaymentMinor = quote.cycleTotal;
    if (input.action === "SUBSCRIBE") {
      if (sub.externalSubscriptionId && sub.renewalCancellationStatus !== "CANCELLED_VERIFIED") throw new Error("V2_RECONCILE_EXISTING_SUBSCRIPTION");
      if (sub.periodEnd && sub.periodEnd > now && sub.lastPaymentStatus === "CONFIRMED") throw new Error("V2_CURRENT_PAID_PERIOD_ACTIVE");
      if (sub.trialEnd && sub.trialEnd > now) effectiveAt = sub.trialEnd;
    } else {
      if (!sub.externalSubscriptionId || sub.renewalCancellationStatus || sub.lastPaymentStatus !== "CONFIRMED" || !sub.periodStart || !sub.periodEnd || sub.periodStart > now || sub.periodEnd <= now) throw new Error("VALID_PAID_PERIOD_REQUIRED");
      strategy = changeTiming(selectionOf(sub), selection);
      if (await tx.staff.count({ where: { businessId: input.businessId, isActive: true } }) > selection.professionalTotal) throw new Error("ACTIVE_PROFESSIONALS_EXCEED_SELECTION");
      effectiveAt = strategy === "NEXT_RENEWAL" ? sub.periodEnd : now;
      expectedPaymentMinor = strategy === "IMMEDIATE" ? expansionAmount(selectionOf(sub), selection, sub.periodStart, sub.periodEnd, now) : quote.cycleTotal;
    }
    const op = await tx.commercialBillingOperation.create({ data: { businessId: input.businessId, subscriptionId: sub.id, provider: "MERCADO_PAGO", environment: provider.config.environment,
      kind: input.action === "SUBSCRIBE" ? "NEW_SUBSCRIPTION" : "CONTRACT_CHANGE", strategy, status: "PREPARED", idempotencyKey: key, inputHash,
      previousContractHash: sub.snapshotHash, targetPlanCode: selection.plan, targetProfessionalTotal: selection.professionalTotal,
      quoteSnapshot: commercialJson({ selection, quote, acceptedAt: now, actorId: input.actorId, ...(input.action === "CHANGE" ? { periodStart: sub.periodStart, periodEnd: sub.periodEnd, previousSelection: selectionOf(sub) } : {}) }),
      recurringAmountMinor: quote.cycleTotal, expectedPaymentMinor, taxAmountMinor: includedVat(expectedPaymentMinor).vat,
      effectiveAt, providerSubscriptionId: input.action === "CHANGE" ? sub.externalSubscriptionId : null } });
    await tx.commercialEvent.create({ data: { businessId: sub.businessId, subscriptionId: sub.id, source: "mp_v2_consent", eventId: op.id, operation: op.kind,
      occurredAt: now, payloadHash: inputHash, outcome: "APPLIED", details: commercialJson({ actorId: input.actorId, selection, total: expectedPaymentMinor, recurringTotal: quote.cycleTotal, vatIncluded: true, firstChargeAt: effectiveAt, automaticRenewal: true }) } });
    return op;
  });
}

async function boundCurrent(op: CommercialBillingOperation, provider: MpV2Provider) {
  if (!op.providerSubscriptionId) throw new Error("V2_PROVIDER_SUBSCRIPTION_REQUIRED");
  const sub = await provider.subscription(op.providerSubscriptionId), root = await subscriptionRoot(sub, provider);
  if (root.businessId !== op.businessId || root.subscriptionId !== op.subscriptionId) throw new Error("V2_TENANT_MISMATCH");
  assertBinding(sub, root);
  return sub;
}
function assertRecurring(sub: MpV2Subscription, op: CommercialBillingOperation) {
  const { quote, selection } = quoteOf(op);
  if (sub.auto_recurring.transaction_amount !== quote.cycleTotal || sub.auto_recurring.frequency !== (selection.billingCycle === "ANNUAL" ? 12 : 1)) throw new Error("V2_PROVIDER_QUOTE_MISMATCH");
}
export async function executeMpV2Operation(businessId: string, id: string, payerEmail: string, provider = createMpV2Provider()) {
  let op = await ownedOperation(businessId, id, provider);
  if (op.status !== "PREPARED") return mpV2OperationView(op, provider);
  await provider.checkAccount();
  if (!z.email().safeParse(payerEmail).success) throw new Error("V2_PAYER_EMAIL_INVALID");
  const claimed = await prisma.$transaction(async tx => {
    await lock(tx, businessId); const { sub } = await runtimeContract(tx, businessId);
    if (sub.snapshotHash !== op.previousContractHash) throw new Error("V2_CONTRACT_CHANGED");
    if (op.kind === "CONTRACT_CHANGE" && (!sub.periodEnd || sub.periodEnd <= new Date())) throw new Error("V2_CHANGE_PERIOD_EXPIRED");
    return tx.commercialBillingOperation.updateMany({ where: { id, status: "PREPARED" }, data: { status: "EXECUTING", executionStartedAt: new Date() } });
  });
  if (!claimed.count) return mpV2OperationView(await ownedOperation(businessId, id, provider), provider);
  const { quote, selection } = quoteOf(op);
  try {
    if (op.kind === "NEW_SUBSCRIPTION") {
      const created = provider.validateSubscription(await provider.port.create({ reason: `${quote.displayName} · ${selection.professionalTotal} profesionales · ${selection.billingCycle === "ANNUAL" ? "anual" : "mensual"}`,
        external_reference: rootReference(id), payer_email: payerEmail, status: "pending", back_url: provider.config.returnUrl,
        auto_recurring: { frequency: selection.billingCycle === "ANNUAL" ? 12 : 1, frequency_type: "months", currency_id: "CLP", transaction_amount: quote.cycleTotal,
          ...(op.effectiveAt > new Date() ? { start_date: op.effectiveAt.toISOString() } : {}) } }, id));
      assertRecurring(created, op);
      if (created.external_reference !== rootReference(id)) throw new Error("V2_PROVIDER_REFERENCE_MISMATCH");
      if (op.effectiveAt > new Date() && (!created.auto_recurring.start_date || Math.abs(+created.auto_recurring.start_date - +op.effectiveAt) > 1000)) throw new Error("V2_TRIAL_FIRST_CHARGE_UNVERIFIED");
      const url = created.init_point ? provider.checkoutUrl(created.init_point, created.id) : null;
      await prisma.$transaction(async tx => {
        await lock(tx, businessId); const { sub } = await runtimeContract(tx, businessId);
        if (sub.snapshotHash !== op.previousContractHash) throw new Error("V2_CONTRACT_CHANGED");
        await tx.commercialBillingOperation.updateMany({ where: { id, status: { in: ["EXECUTING", "UNKNOWN"] } }, data: { status: "AWAITING_PAYMENT", providerSubscriptionId: created.id, providerOperationId: created.id, providerPreview: commercialJson({ checkoutUrl: url }) } });
        await tx.commercialSubscription.update({ where: { id: sub.id }, data: { provider: "MERCADO_PAGO", externalSubscriptionId: created.id, externalReference: rootReference(id), renewalCancellationStatus: null, renewalCancellationRequestedAt: null, renewalCancelledAt: null } });
      });
    } else if (op.strategy === "NEXT_RENEWAL") {
      await updateRecurring(op, provider);
      await prisma.commercialBillingOperation.update({ where: { id }, data: { status: "SCHEDULED", providerOperationId: op.providerSubscriptionId } });
    } else {
      await boundCurrent(op, provider);
      const saved = quoteOf(op);
      const preference = z.object({ id: z.string(), init_point: z.string(), sandbox_init_point: z.string().optional() }).parse(await provider.port.preference({
        items: [{ id, title: `Ampliación ${quote.displayName} hasta ${saved.periodEnd!.toISOString().slice(0, 10)}`, quantity: 1, currency_id: "CLP", unit_price: op.expectedPaymentMinor! }],
        payer: { email: payerEmail }, external_reference: changeReference(id), notification_url: provider.config.webhookUrl,
        back_urls: { success: provider.config.returnUrl, failure: provider.config.returnUrl, pending: provider.config.returnUrl },
        expires: true, expiration_date_to: saved.periodEnd!.toISOString(), payment_methods: { installments: 1 },
      }, id));
      const url = provider.checkoutUrl(provider.config.environment === "V2_SANDBOX" ? preference.sandbox_init_point ?? preference.init_point : preference.init_point);
      await prisma.commercialBillingOperation.update({ where: { id }, data: { status: "AWAITING_PAYMENT", providerOperationId: preference.id, providerPreview: commercialJson({ checkoutUrl: url }) } });
    }
  } catch {
    // Includes malformed responses and timeout after remote success. Never issue another POST.
    await prisma.commercialBillingOperation.updateMany({ where: { id, status: "EXECUTING" }, data: { status: "UNKNOWN", failureCode: "V2_PROVIDER_RESULT_UNKNOWN" } });
  }
  op = await ownedOperation(businessId, id, provider);
  return mpV2OperationView(op, provider);
}
async function updateRecurring(op: CommercialBillingOperation, provider: MpV2Provider) {
  const current = await boundCurrent(op, provider);
  if (current.status !== "authorized") throw new Error("V2_AUTHORIZED_SUBSCRIPTION_REQUIRED");
  const before = quoteOf(op);
  if (op.strategy === "NEXT_RENEWAL") {
    const future = (await provider.invoices(current.id)).some(invoice => invoice.debit_date >= op.effectiveAt);
    if (future && current.auto_recurring.transaction_amount !== before.quote.cycleTotal) throw new Error("V2_RENEWAL_ALREADY_INVOICED");
  }
  // An uncertain PUT may already have succeeded. A canonical read is enough to recover it.
  if (current.auto_recurring.transaction_amount === before.quote.cycleTotal) { assertRecurring(current, op); return; }
  const response = provider.validateSubscription(await provider.port.update(current.id, { auto_recurring: { transaction_amount: before.quote.cycleTotal, currency_id: "CLP" } }));
  assertRecurring(response, op);
  const canonical = await provider.subscription(current.id);
  if (canonical.external_reference !== current.external_reference) throw new Error("V2_PROVIDER_REFERENCE_MISMATCH");
  assertRecurring(canonical, op);
}
export function mpV2OperationView(op: CommercialBillingOperation, provider: MpV2Provider) {
  const url = (op.providerPreview as { checkoutUrl?: string } | null)?.checkoutUrl;
  return { operationId: op.id, status: op.status, checkoutUrl: url && op.status === "AWAITING_PAYMENT" ? provider.checkoutUrl(url, op.kind === "NEW_SUBSCRIPTION" ? op.providerSubscriptionId ?? undefined : undefined) : null,
    effectiveAt: op.effectiveAt, total: op.expectedPaymentMinor, recurringTotal: op.recurringAmountMinor, vatIncluded: true };
}

async function applySelection(tx: Prisma.TransactionClient, sub: CommercialSubscription, op: CommercialBillingOperation, data: Prisma.CommercialSubscriptionUpdateInput, now: Date) {
  const { selection, quote } = quoteOf(op);
  const terms = { origin: "registration_v2", vatIncluded: true, annualPaidMonths: quote.billingCycle === "ANNUAL" ? quote.paidMonths : null, annualFreeMonths: quote.billingCycle === "ANNUAL" ? quote.freeMonths : 0, quote };
  const updated = await tx.commercialSubscription.update({ where: { id: sub.id }, data: { ...data, planCode: selection.plan, professionalTotal: selection.professionalTotal, billingCycle: selection.billingCycle,
    basePriceClp: quote.baseMonthly, totalPriceClp: quote.cycleTotal, termsSnapshot: commercialJson(terms), snapshotHash: commercialHash({ selection, terms, operation: op.id, periodEnd: data.periodEnd ?? sub.periodEnd }) } });
  await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId: sub.id, effectiveTo: null }, data: { effectiveTo: now } });
  const base = quote.billingCycle === "ANNUAL" ? quote.baseMonthly * quote.paidMonths : quote.baseMonthly;
  await tx.commercialSubscriptionItem.createMany({ data: [
    { subscriptionId: sub.id, kind: "BASE_PLAN", code: selection.plan, quantity: 1, amountClp: base, unitAmountClp: quote.baseMonthly, catalogVersion: quote.catalogVersion, effectiveFrom: now, pricingSnapshot: commercialJson(quote) },
    { subscriptionId: sub.id, kind: "PROFESSIONAL_SEATS", code: "professional_seats", quantity: selection.professionalTotal, amountClp: quote.cycleTotal - base, catalogVersion: quote.catalogVersion, effectiveFrom: now, pricingSnapshot: commercialJson(quote.surchargeSteps) },
  ] });
  await materializeCommercialEntitlements(tx, updated, now);
  return updated;
}
const paymentState = (status: string) => status === "approved" ? "CONFIRMED" : status === "refunded" ? "REFUNDED" : status === "charged_back" ? "CHARGEBACK" : ["rejected", "cancelled"].includes(status) ? "REJECTED" : "PENDING";
export async function reconcileMpV2Invoice(invoice: MpV2Invoice, provider = createMpV2Provider(), now = new Date()) {
  const remote = await provider.subscription(invoice.preapproval_id), root = await subscriptionRoot(remote, provider);
  const rootCycle = quoteOf(root).selection.billingCycle;
  if (remote.auto_recurring.frequency !== (rootCycle === "ANNUAL" ? 12 : 1)) throw new Error("V2_PROVIDER_CYCLE_MISMATCH");
  if (!invoice.payment?.id) return { status: "PENDING" };
  const payment = await provider.payment(invoice.payment.id);
  if (payment.external_reference && payment.external_reference !== rootReference(root.id)) throw new Error("V2_PAYMENT_BINDING_MISMATCH");
  const state = paymentState(payment.status), key = `${provider.config.environment}:${payment.id}`;
  return prisma.$transaction(async tx => {
    await lock(tx, root.businessId); const { sub } = await runtimeContract(tx, root.businessId);
    if (sub.externalSubscriptionId !== remote.id) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
    const candidates = await tx.commercialBillingOperation.findMany({ where: { subscriptionId: sub.id, environment: provider.config.environment, providerSubscriptionId: remote.id,
      kind: "CONTRACT_CHANGE", effectiveAt: { lte: invoice.debit_date }, OR: [{ status: { in: ["SCHEDULED", "APPLIED"] } }, { status: "CANCELLED", providerOperationId: remote.id }] }, orderBy: { effectiveAt: "desc" } });
    const op = candidates[0] ?? root, { selection } = quoteOf(op);
    if (invoice.transaction_amount !== op.recurringAmountMinor || payment.transaction_amount !== invoice.transaction_amount) throw new Error("V2_PAYMENT_AMOUNT_MISMATCH");
    if (invoice.debit_date.getTime() < root.effectiveAt.getTime() - 60_000 || invoice.debit_date > now || (state === "CONFIRMED" && (!payment.date_approved || payment.date_approved > now))) throw new Error("V2_PAYMENT_PERIOD_MISMATCH");
    const end = billingPeriodEnd(invoice.debit_date, selection.billingCycle, root.effectiveAt.getUTCDate());
    const prior = await tx.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: "MERCADO_PAGO", paymentId: key } } });
    if (prior && (prior.operationId !== op.id || prior.businessId !== root.businessId || prior.amountMinor !== payment.transaction_amount || +prior.periodStart !== +invoice.debit_date)) throw new Error("V2_EVIDENCE_CONFLICT");
    if (prior?.status === state || (prior?.status === "CONFIRMED" && ["PENDING", "REJECTED"].includes(state)) || (prior && payment.date_last_updated < prior.occurredAt)) return { status: prior!.status, duplicate: true };
    if (prior && ["REFUNDED", "CHARGEBACK"].includes(prior.status) && state === "CONFIRMED") return { status: prior.status, duplicate: true };
    const eventId = `${key}:${state}`, newer = !sub.periodStart || invoice.debit_date >= sub.periodStart;
    const event = await tx.commercialEvent.upsert({ where: { source_eventId: { source: "mp_v2_payment", eventId } }, update: {}, create: { source: "mp_v2_payment", eventId, businessId: sub.businessId, subscriptionId: sub.id,
      operation: "PAYMENT_RECONCILED", outcome: "APPLIED", occurredAt: payment.date_last_updated, payloadHash: commercialHash({ payment: key, state, invoice: invoice.id }), details: commercialJson({ invoiceId: invoice.id, operationId: op.id, paymentState: state }) } });
    await tx.commercialPaymentEvidence.upsert({ where: { provider_paymentId: { provider: "MERCADO_PAGO", paymentId: key } }, create: { businessId: sub.businessId, operationId: op.id, provider: "MERCADO_PAGO", paymentId: key,
      status: state, origin: `${provider.config.environment}_PROVIDER`, amountMinor: payment.transaction_amount, currencyCode: "CLP", periodStart: invoice.debit_date, periodEnd: end,
      occurredAt: payment.date_last_updated, providerSubscriptionId: remote.id, eventId: event.id }, update: { status: state, occurredAt: payment.date_last_updated, eventId: event.id } });
    if (state === "CONFIRMED" && newer) {
      if (await tx.staff.count({ where: { businessId: sub.businessId, isActive: true } }) > selection.professionalTotal) throw new Error("ACTIVE_PROFESSIONALS_EXCEED_SELECTION");
      // Never undo an expansion paid later in the same recurring period.
      const currentExpansion = sub.periodStart && +sub.periodStart === +invoice.debit_date && sub.totalPriceClp! > op.recurringAmountMinor;
      const data = { status: "ACTIVE" as const, periodStart: invoice.debit_date, periodEnd: end, renewalAt: sub.renewalCancellationStatus === "CANCELLED_VERIFIED" ? null : end,
        lastPaymentStatus: "CONFIRMED", lastPaymentAt: payment.date_approved!, lastPaymentEventId: event.id, lastReconciledAt: now, lastReconciledEventId: event.id };
      if (currentExpansion) { const updated = await tx.commercialSubscription.update({ where: { id: sub.id }, data }); await materializeCommercialEntitlements(tx, updated, now); }
      else await applySelection(tx, sub, op, data, now);
      await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "APPLIED", appliedAt: now, failureCode: null } });
    } else if (["REFUNDED", "CHARGEBACK"].includes(state) && sub.lastPaymentEventId === prior?.eventId) {
      const updated = await tx.commercialSubscription.update({ where: { id: sub.id }, data: { lastPaymentStatus: state, status: "INACTIVE", lastReconciledAt: now } });
      await materializeCommercialEntitlements(tx, updated, now);
    }
    // Pending/rejected invoices do not revoke an unexpired trial/paid grant.
    return { status: state, duplicate: false };
  });
}

async function reconcileExpansion(op: CommercialBillingOperation, paymentId: string, provider: MpV2Provider, now = new Date()) {
  const payment = await provider.payment(paymentId), saved = quoteOf(op), state = paymentState(payment.status);
  if (op.kind !== "CONTRACT_CHANGE" || op.strategy !== "IMMEDIATE" || payment.external_reference !== changeReference(op.id) || payment.transaction_amount !== op.expectedPaymentMinor) throw new Error("V2_EXPANSION_PAYMENT_MISMATCH");
  if (!saved.periodStart || !saved.periodEnd) throw new Error("V2_CHANGE_PERIOD_REQUIRED");
  const existing = await prisma.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: "MERCADO_PAGO", paymentId: `${provider.config.environment}:${payment.id}` } } });
  if (existing && existing.operationId !== op.id) throw new Error("V2_EVIDENCE_CONFLICT");
  if (existing?.status === state || (existing?.status === "CONFIRMED" && ["PENDING", "REJECTED"].includes(state)) || (existing && payment.date_last_updated < existing.occurredAt) || (existing && ["REFUNDED", "CHARGEBACK"].includes(existing.status) && state === "CONFIRMED")) return;
  if (state === "CONFIRMED") {
    const other = await prisma.commercialPaymentEvidence.findFirst({ where: { operationId: op.id, status: "CONFIRMED", paymentId: { not: `${provider.config.environment}:${payment.id}` } } });
    if (other) throw new Error("V2_DUPLICATE_PAYMENT_REVIEW_REQUIRED");
    if (!payment.date_approved || payment.date_approved < op.effectiveAt || payment.date_approved >= saved.periodEnd) throw new Error("V2_CHANGE_PERIOD_EXPIRED");
    const current = await prisma.$transaction(async tx => { await lock(tx, op.businessId); return (await runtimeContract(tx, op.businessId)).sub; });
    if (current.snapshotHash !== op.previousContractHash || +current.periodEnd! !== +saved.periodEnd) throw new Error("V2_CONTRACT_CHANGED");
    // Retrying this PUT after a timeout converges on the same authorized amount.
    await updateRecurring(op, provider);
  }
  await prisma.$transaction(async tx => {
    await lock(tx, op.businessId); const { sub } = await runtimeContract(tx, op.businessId);
    const key = `${provider.config.environment}:${payment.id}`;
    const prior = await tx.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: "MERCADO_PAGO", paymentId: key } } });
    if (prior && prior.operationId !== op.id) throw new Error("V2_EVIDENCE_CONFLICT");
    if (prior?.status === state || (prior?.status === "CONFIRMED" && ["PENDING", "REJECTED"].includes(state)) || (prior && payment.date_last_updated < prior.occurredAt)) return;
    if (prior && ["REFUNDED", "CHARGEBACK"].includes(prior.status) && state === "CONFIRMED") return;
    const eventId = `${key}:${state}`;
    const event = await tx.commercialEvent.upsert({ where: { source_eventId: { source: "mp_v2_payment", eventId } }, update: {}, create: { source: "mp_v2_payment", eventId, businessId: sub.businessId, subscriptionId: sub.id, operation: "EXPANSION_PAYMENT", outcome: "APPLIED", occurredAt: payment.date_last_updated, payloadHash: commercialHash({ key, state }), details: { paymentState: state } } });
    await tx.commercialPaymentEvidence.upsert({ where: { provider_paymentId: { provider: "MERCADO_PAGO", paymentId: key } }, create: { businessId: sub.businessId, operationId: op.id, provider: "MERCADO_PAGO", paymentId: key, status: state,
      origin: `${provider.config.environment}_PROVIDER`, amountMinor: payment.transaction_amount, currencyCode: "CLP", periodStart: op.effectiveAt, periodEnd: saved.periodEnd!, occurredAt: payment.date_last_updated, providerSubscriptionId: op.providerSubscriptionId!, eventId: event.id }, update: { status: state, eventId: event.id, occurredAt: payment.date_last_updated } });
    if (state === "CONFIRMED") {
      if (sub.snapshotHash !== op.previousContractHash || !sub.periodEnd || +sub.periodEnd !== +saved.periodEnd!) throw new Error("V2_CONTRACT_CHANGED");
      await applySelection(tx, sub, op, { lastReconciledAt: now, lastReconciledEventId: event.id }, now);
      await tx.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "APPLIED", appliedAt: now, failureCode: null } });
    } else if (["REFUNDED", "CHARGEBACK"].includes(state) && prior?.status === "CONFIRMED") {
      const updated = await tx.commercialSubscription.update({ where: { id: sub.id }, data: { status: "INACTIVE", lastPaymentStatus: state } });
      await materializeCommercialEntitlements(tx, updated, now);
    }
  });
}

export async function reconcileMpV2Operation(businessId: string, id: string, provider = createMpV2Provider()) {
  await provider.checkAccount();
  let op = await ownedOperation(businessId, id, provider);
  let recoveryUrl: string | null = null;
  // Preparation persists the owner's consent before the provider call. Resume a
  // crash in that small gap using that existing operation and authenticated owner.
  if (op.status === "PREPARED") {
    const owner = await prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { owner: { select: { email: true } } } });
    if (!owner.owner) throw new Error("OWNER_REQUIRED");
    return executeMpV2Operation(businessId, id, owner.owner.email, provider);
  }
  if (op.kind === "CANCEL_RENEWAL") return cancelMpV2Renewal(businessId, quoteOf(op).actorId, provider);
  if (op.kind === "NEW_SUBSCRIPTION") {
    if (!op.providerSubscriptionId) {
      if (!["UNKNOWN", "EXECUTING"].includes(op.status)) return mpV2OperationView(op, provider);
      const found = z.object({ results: z.array(z.unknown()) }).parse(await provider.port.search(rootReference(op.id)));
      const matches = found.results.map(value => provider.validateSubscription(value)).filter(sub => sub.external_reference === rootReference(op.id));
      if (matches.length !== 1) return mpV2OperationView(op, provider); // Ambiguous/absent: preserve UNKNOWN; do not POST again.
      await subscriptionRoot(matches[0], provider); op = await ownedOperation(businessId, id, provider);
    }
    const remote = await boundCurrent(op, provider);
    await reconcileCancellation(remote, provider);
    for (const invoice of (await provider.invoices(remote.id)).sort((a, b) => +a.debit_date - +b.debit_date)) await reconcileMpV2Invoice(invoice, provider);
    const latestPayment = await prisma.commercialPaymentEvidence.findFirst({ where: { operation: { subscriptionId: op.subscriptionId, environment: provider.config.environment } }, orderBy: { occurredAt: "desc" } });
    if (remote.init_point && ["pending", "authorized"].includes(remote.status) && latestPayment && ["PENDING", "REJECTED"].includes(latestPayment.status)) recoveryUrl = provider.checkoutUrl(remote.init_point, remote.id);
    if ((await ownedOperation(businessId, id, provider)).status === "AWAITING_PAYMENT" && remote.init_point) {
      await prisma.commercialBillingOperation.update({ where: { id }, data: { providerPreview: commercialJson({ checkoutUrl: provider.checkoutUrl(remote.init_point, remote.id) }) } });
    }
  } else if (op.strategy === "IMMEDIATE") {
    const payments = z.object({ results: z.array(z.object({ id: z.union([z.string(), z.number()]).transform(String) })) }).parse(await provider.port.payments(changeReference(op.id)));
    for (const payment of payments.results) await reconcileExpansion(op, payment.id, provider);
  } else if (["UNKNOWN", "EXECUTING"].includes(op.status)) {
    await updateRecurring(op, provider);
    await prisma.commercialBillingOperation.update({ where: { id }, data: { status: "SCHEDULED", failureCode: null } });
  } else if (op.status === "SCHEDULED") {
    const remote = await boundCurrent(op, provider);
    await reconcileCancellation(remote, provider);
    for (const invoice of (await provider.invoices(remote.id)).sort((a, b) => +a.debit_date - +b.debit_date)) await reconcileMpV2Invoice(invoice, provider);
  }
  // Rotate bounded cron batches even when a provider still reports pending.
  await prisma.commercialBillingOperation.update({ where: { id }, data: { updatedAt: new Date() } });
  const result = mpV2OperationView(await ownedOperation(businessId, id, provider), provider);
  return recoveryUrl ? { ...result, checkoutUrl: recoveryUrl } : result;
}

async function reconcileCancellation(remote: MpV2Subscription, provider: MpV2Provider) {
  if (!["cancelled", "canceled", "paused"].includes(remote.status)) return;
  const root = await subscriptionRoot(remote, provider);
  await prisma.$transaction(async tx => {
    await lock(tx, root.businessId); const { sub } = await runtimeContract(tx, root.businessId);
    if (sub.externalSubscriptionId !== remote.id) throw new Error("V2_CONTRACT_BINDING_MISMATCH");
    await tx.commercialSubscription.update({ where: { id: sub.id }, data: { renewalCancellationStatus: remote.status === "paused" ? "PAUSED" : "CANCELLED_VERIFIED", renewalCancelledAt: new Date(), renewalAt: null } });
    await tx.commercialBillingOperation.updateMany({ where: { businessId: sub.businessId, providerSubscriptionId: remote.id, status: { in: V2_OPEN_STATUSES }, kind: { not: "CANCEL_RENEWAL" } }, data: { status: "CANCELLED" } });
  });
}
export async function cancelMpV2Renewal(businessId: string, actorId: string, provider = createMpV2Provider()) {
  await provider.checkAccount();
  const { sub } = await prisma.$transaction(async tx => { await lock(tx, businessId); return runtimeContract(tx, businessId, actorId); });
  if (!sub.externalSubscriptionId) throw new Error("V2_PROVIDER_SUBSCRIPTION_REQUIRED");
  const remote = await provider.subscription(sub.externalSubscriptionId), root = await subscriptionRoot(remote, provider);
  if (root.businessId !== businessId) throw new Error("V2_TENANT_MISMATCH");
  const op = await prisma.$transaction(async tx => {
    await lock(tx, businessId); await runtimeContract(tx, businessId, actorId);
    const key = `mp-v2:cancel:${provider.config.environment}:${remote.id}`;
    const found = await tx.commercialBillingOperation.findUnique({ where: { idempotencyKey: key } });
    if (found) return found;
    await tx.commercialSubscription.update({ where: { id: sub.id }, data: { renewalCancellationStatus: "REQUESTED", renewalCancellationRequestedAt: new Date() } });
    return tx.commercialBillingOperation.create({ data: { businessId, subscriptionId: sub.id, provider: "MERCADO_PAGO", environment: provider.config.environment, kind: "CANCEL_RENEWAL", strategy: "NEXT_RENEWAL", status: "EXECUTING", idempotencyKey: key,
      inputHash: commercialHash({ remote: remote.id, actorId }), previousContractHash: sub.snapshotHash, targetPlanCode: sub.planCode, targetProfessionalTotal: sub.professionalTotal,
      quoteSnapshot: commercialJson({ selection: selectionOf(sub), quote: v2Quote(selectionOf(sub)), acceptedAt: new Date(), actorId }), recurringAmountMinor: v2Quote(selectionOf(sub)).cycleTotal,
      effectiveAt: sub.periodEnd ?? new Date(), providerSubscriptionId: remote.id, executionStartedAt: new Date() } });
  });
  try {
    if (!["cancelled", "canceled"].includes(remote.status)) await provider.port.update(remote.id, { status: "cancelled" });
    const canonical = await provider.subscription(remote.id); assertBinding(canonical, root);
    if (!["cancelled", "canceled"].includes(canonical.status)) throw new Error("V2_CANCELLATION_UNCONFIRMED");
    await reconcileCancellation(canonical, provider);
    await prisma.commercialBillingOperation.update({ where: { id: op.id }, data: { status: "APPLIED", appliedAt: new Date(), failureCode: null } });
  } catch { await prisma.commercialBillingOperation.updateMany({ where: { id: op.id, status: { not: "APPLIED" } }, data: { status: "UNKNOWN", failureCode: "V2_CANCELLATION_UNCONFIRMED" } }); }
  return mpV2OperationView(await ownedOperation(businessId, op.id, provider), provider);
}
export async function handleMpV2Webhook(raw: string, headers: Headers, queryId: string | null, provider = createMpV2Provider()) {
  const notification = provider.verifyWebhook(raw, headers, queryId);
  await provider.checkAccount();
  if (notification.type === "payment") {
    const payment = await provider.payment(notification.resourceId);
    if (payment.external_reference?.startsWith("v2_change_")) {
      const op = await prisma.commercialBillingOperation.findFirst({ where: { id: payment.external_reference.slice(10), environment: provider.config.environment, provider: "MERCADO_PAGO" } });
      if (!op) throw new Error("V2_OPERATION_NOT_FOUND");
      await reconcileExpansion(op, payment.id, provider); return;
    }
    const found = z.object({ results: z.array(mpV2InvoiceSchema) }).parse(await provider.port.invoicesForPayment(payment.id));
    if (found.results.length !== 1 || found.results[0].payment?.id !== payment.id) throw new Error("V2_PAYMENT_BINDING_MISMATCH");
    await reconcileMpV2Invoice(found.results[0], provider);
  } else if (notification.type === "subscription_authorized_payment") {
    const invoice = mpV2InvoiceSchema.parse(await provider.port.invoice(notification.resourceId));
    if (invoice.id !== notification.resourceId) throw new Error("V2_INVOICE_ID_MISMATCH");
    await reconcileMpV2Invoice(invoice, provider);
  } else {
    const remote = await provider.subscription(notification.resourceId), root = await subscriptionRoot(remote, provider);
    await reconcileCancellation(remote, provider);
    await reconcileMpV2Operation(root.businessId, root.id, provider);
  }
}
/** Canonical status recovery without assuming authorization is payment. */
export async function reconcileMpV2SubscriptionStatus(id: string, provider: MpV2Provider) {
  const remote = await provider.subscription(id), root = await subscriptionRoot(remote, provider);
  assertBinding(remote, root);
  await reconcileCancellation(remote, provider);
  return { remote, root };
}
export async function runMpV2Reconciliation(provider?: MpV2Provider, options?: import("./mercadopago-v2-recovery").MpV2RecoveryOptions) {
  const { runMpV2Recovery } = await import("./mercadopago-v2-recovery");
  return runMpV2Recovery(provider, options);
}
