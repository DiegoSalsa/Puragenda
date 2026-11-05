import {z} from "zod";
import {addMonths, addYears} from "date-fns";
import type {CommercialBillingOperation, Prisma} from "@prisma/client";
import {prisma} from "@/server/db/prisma";
import {getStaffLimit} from "@/core/subscription-plan";
import {hasOperationalSubscriptionAccess, isTrialCurrentlyActive} from "@/core/subscription-access";
import {COMMERCIAL_CATALOG_VERSION} from "@/core/commercial-catalog";
import {legacyPlusTerms, plusUpgradeCycleAmount, remainingPlusAmount, type LegacyPlusTerms} from "@/core/legacy-plus";
import {commercialHash, assertNoOpenCommercialMigration} from "@/server/services/commercial-internal";
import {commercialJson, materializeCommercialEntitlements} from "@/server/services/commercial-subscription-v2.service";
import {calculateNextBillingPreview, calculateSubscriptionBaseAmount} from "@/server/services/subscription-billing.service";
import {processMercadoPagoInvoice, type MercadoPagoInvoiceSnapshot} from "@/server/services/subscription-dunning.service";
import {createMpV2Provider, type MpV2Provider, type MpV2Payment} from "./mercadopago-v2-provider";
import {includedVat} from "@/core/commercial-billing-policy";
import {effectiveSnapshotAccess} from "@/server/services/commercial-plan-access";

const include = {subscription: true, commercialSubscription: true, websiteAddon: true} as const;
type Business = Prisma.BusinessGetPayload<{include: typeof include}>;
const reference = (id: string) => `legacy_plus_${id}`;
const selection = z.object({plan: z.literal("PURAGENDA_PLUS"), professionalTotal: z.number().int().min(1).max(20), billingCycle: z.enum(["MONTHLY", "ANNUAL"])});
const quoteSchema = z.object({origin: z.literal("legacy_plus_checkout"), selection, sourceHash: z.string(),
  baseSubscriptionId: z.string(), baseCycleAmount: z.number().int().nonnegative(), upgradeCycleAmount: z.number().int().positive(),
  periodStart: z.coerce.date(), periodEnd: z.coerce.date(), firstChargeAt: z.coerce.date(),
  mode: z.enum(["EXTENSION", "COMBINED"]), manual: z.boolean(), acceptedBy: z.string(), acceptedAt: z.coerce.date()});
type Saved = z.infer<typeof quoteSchema>;
const endOf = (start: Date, cycle: "MONTHLY" | "ANNUAL") => cycle === "ANNUAL" ? addYears(start, 1) : addMonths(start, 1);
const startOf = (end: Date, cycle: "MONTHLY" | "ANNUAL") => cycle === "ANNUAL" ? addYears(end, -1) : addMonths(end, -1);
const open = ["PREPARED", "EXECUTING", "UNKNOWN", "AWAITING_PAYMENT", "PAID"];

/** Older pending/authorized contracts were created without external_reference.
 * Normalize that absent field only here; tenant/account/application ownership
 * is still verified, and V2 registration contracts keep their strict binding. */
async function legacySubscription(provider: MpV2Provider, id: string) {
  const raw = z.object({id:z.union([z.string(),z.number()]),external_reference:z.string().nullish()}).passthrough().parse(await provider.port.subscription(id));
  const value = provider.validateSubscription({...raw,external_reference:raw.external_reference??""});
  if(value.id!==id)throw new Error("LEGACY_PLUS_PROVIDER_BINDING_MISMATCH");
  return value;
}

export function legacyPlusSourceHash(business: Business) {
  const s = business.subscription!;
  return commercialHash({businessId: business.id, ownerId: business.ownerId, country: business.countryCode, currency: business.currencyCode,
    subscriptionId: s.id, plan: s.plan, status: s.status, trial: s.isTrial, trialEnd: s.trialEndsAt, cycle: s.billingCycle,
    professionalTotal: getStaffLimit(s), method: s.paymentMethod, amount: calculateSubscriptionBaseAmount(s),
    providerId: s.paymentMethod === "BANK_TRANSFER" ? null : s.mpSubscriptionId,
    benefit: {discount: s.pendingDiscountPercentage, free: s.freeMonthsRemaining, promoFree: s.promoFreeMonthsRemaining, promoDiscount: s.promoDiscountMonthsRemaining, override: s.nextBillingOverrideAmount}});
}
export async function readLegacyPlusBusiness(businessId: string, db: Pick<Prisma.TransactionClient, "business"> = prisma) {
  return db.business.findUniqueOrThrow({where: {id: businessId}, include});
}
function assertBusiness(business: Business, actorId: string) {
  const s = business.subscription;
  if (business.deletedAt || business.ownerId !== actorId || !s) throw new Error("OWNER_REQUIRED");
  if (business.countryCode !== "CL" || business.currencyCode !== "CLP" || s.paddleSubscriptionId) throw new Error("LEGACY_PLUS_CHILE_REQUIRED");
  if (!["INDIVIDUAL", "EQUIPO", "TEST"].includes(s.plan)) throw new Error("LEGACY_PLUS_BASE_REQUIRED");
  if (business.commercialSubscription && !legacyPlusTerms(business.commercialSubscription.termsSnapshot) && ["PURAGENDA", "PURAGENDA_PLUS"].includes(business.commercialSubscription.planCode)) throw new Error("LEGACY_PLUS_BASE_REQUIRED");
}
export async function legacyPlusOffer(business: Business, actorId: string, provider?: MpV2Provider, now = new Date()) {
  assertBusiness(business, actorId); const s = business.subscription!;
  const professionalTotal = getStaffLimit(s), upgradeCycleAmount = plusUpgradeCycleAmount(professionalTotal, s.billingCycle);
  const baseCycleAmount = calculateSubscriptionBaseAmount(s), manual = s.paymentMethod === "BANK_TRANSFER";
  const trial = isTrialCurrentlyActive(s, now), active = hasOperationalSubscriptionAccess(s, now) && !trial;
  let periodEnd = s.currentPeriodEnd && s.currentPeriodEnd > now ? s.currentPeriodEnd : endOf(now, s.billingCycle);
  // The provider's billing anchor is authoritative when the old projection is stale.
  // A manual account's historical MP reference is never read or modified.
  if (active && !manual && s.mpSubscriptionId && provider) {
    const remote = await legacySubscription(provider,s.mpSubscriptionId);
    if (remote.next_payment_date && remote.next_payment_date > now) periodEnd = remote.next_payment_date;
  }
  let periodStart = active ? startOf(periodEnd, s.billingCycle) : now;
  if (periodStart > now) { periodStart = now; periodEnd = endOf(now, s.billingCycle); }
  const firstChargeAt = trial ? s.trialEndsAt! : now;
  const mode = active ? "EXTENSION" as const : "COMBINED" as const;
  const amountDue = active ? remainingPlusAmount(upgradeCycleAmount, periodStart, periodEnd, now)
    : calculateNextBillingPreview(s).amountDue + upgradeCycleAmount;
  return {kind: "LEGACY_PLUS" as const, contractHash: legacyPlusSourceHash(business), professionalTotal, billingCycle: s.billingCycle,
    baseCycleAmount, upgradeCycleAmount, total: baseCycleAmount + upgradeCycleAmount, amountDue, periodStart, periodEnd,
    firstChargeAt, mode, manual, trial, currentPlus: business.commercialSubscription?.planCode === "PURAGENDA_PLUS",
    nextAmount: calculateNextBillingPreview(s).amountDue + upgradeCycleAmount};
}
function saved(op: CommercialBillingOperation) {
  const q = quoteSchema.parse(op.quoteSnapshot);
  if (op.targetPlanCode !== "PURAGENDA_PLUS" || op.targetProfessionalTotal !== q.selection.professionalTotal ||
      op.recurringAmountMinor !== q.baseCycleAmount + q.upgradeCycleAmount || !op.expectedPaymentMinor || op.expectedPaymentMinor < 1 || commercialHash(q) !== op.inputHash) throw new Error("LEGACY_PLUS_QUOTE_MISMATCH");
  return q;
}
function termsFor(q: Saved, providerId: string | null, previous?: unknown): LegacyPlusTerms {
  const prior = legacyPlusTerms(previous);
  return {origin: "legacy_plus_upgrade", baseSubscriptionId: q.baseSubscriptionId, basePlan: prior?.basePlan ?? "INDIVIDUAL",
    baseCycleAmount: q.baseCycleAmount, upgradeCycleAmount: q.upgradeCycleAmount,
    combinedRecurring: q.mode === "COMBINED" && !q.manual && !!providerId, providerSubscriptionId: providerId,
    cancelAt: prior && new Date(prior.acceptedAt) >= q.acceptedAt ? prior.cancelAt : null,
    acceptedBy: q.acceptedBy, acceptedAt: q.acceptedAt.toISOString()};
}
export function legacyPlusOperationView(op: CommercialBillingOperation, provider: MpV2Provider) {
  const preview = op.providerPreview as {checkoutUrl?: string} | null;
  return {operationId: op.id, status: op.status, checkoutUrl: preview?.checkoutUrl && op.status === "AWAITING_PAYMENT" ? provider.checkoutUrl(preview.checkoutUrl, op.kind === "NEW_SUBSCRIPTION" ? op.providerSubscriptionId ?? undefined : undefined) : null};
}
export async function prepareLegacyPlusCheckout(input: {businessId: string; actorId: string; idempotencyKey: string; expectedContractHash: string}, provider = createMpV2Provider(), now = new Date()) {
  const business = await readLegacyPlusBusiness(input.businessId); assertBusiness(business, input.actorId);
  if (business.commercialSubscription?.planCode === "PURAGENDA_PLUS" && effectiveSnapshotAccess(business.commercialSubscription, now).commercialAccess) throw new Error("LEGACY_PLUS_ALREADY_ACTIVE");
  if (input.expectedContractHash !== legacyPlusSourceHash(business)) throw new Error("LEGACY_PLUS_CONTRACT_CHANGED");
  const offer = await legacyPlusOffer(business, input.actorId, provider, now);
  const sub = business.subscription!;
  const addon = business.websiteAddon;
  if (addon && (addon.mpSubscriptionId || addon.paddleSubscriptionId) && addon.status !== "CANCELLED" && !addon.cancelAt) throw new Error("LEGACY_PLUS_WEBSITE_BILLING_REVIEW");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${input.businessId} FOR UPDATE`;
    const current = await readLegacyPlusBusiness(input.businessId, tx); assertBusiness(current, input.actorId);
    const currentAddon=current.websiteAddon;
    if(currentAddon&&(currentAddon.mpSubscriptionId||currentAddon.paddleSubscriptionId)&&currentAddon.status!=="CANCELLED"&&!currentAddon.cancelAt)throw new Error("LEGACY_PLUS_WEBSITE_BILLING_REVIEW");
    if (legacyPlusSourceHash(current) !== input.expectedContractHash) throw new Error("LEGACY_PLUS_CONTRACT_CHANGED");
    await assertNoOpenCommercialMigration(tx, input.businessId);
    const key = `legacy-plus:${provider.config.environment}:${input.businessId}:${input.idempotencyKey}`;
    const prior = await tx.commercialBillingOperation.findUnique({where: {idempotencyKey: key}});
    if (prior) { saved(prior); return prior; }
    const pending = await tx.commercialBillingOperation.findFirst({where: {businessId: input.businessId, status: {in: open}}});
    if (pending) {
      if ((pending.quoteSnapshot as {origin?: string}).origin !== "legacy_plus_checkout" || pending.environment !== provider.config.environment) throw new Error("LEGACY_PLUS_OPERATION_PENDING");
      return pending;
    }
    const q: Saved = {origin: "legacy_plus_checkout", selection: {plan: "PURAGENDA_PLUS", professionalTotal: offer.professionalTotal, billingCycle: offer.billingCycle},
      sourceHash: offer.contractHash, baseSubscriptionId: sub.id, baseCycleAmount: offer.baseCycleAmount, upgradeCycleAmount: offer.upgradeCycleAmount,
      periodStart: offer.periodStart, periodEnd: offer.periodEnd, firstChargeAt: offer.firstChargeAt, mode: offer.mode, manual: offer.manual, acceptedBy: input.actorId, acceptedAt: now};
    const snapshot = current.commercialSubscription ?? await tx.commercialSubscription.create({data: {
      businessId: input.businessId, legacySubscriptionId: sub.id, legacyPlanCode: sub.plan, planCode: sub.plan, catalogVersion: COMMERCIAL_CATALOG_VERSION,
      status: sub.status === "TRIALING" ? "TRIALING" : sub.status === "ACTIVE" ? "ACTIVE" : "INACTIVE", provider: "NONE", currencyCode: "CLP",
      billingCycle: sub.billingCycle, professionalTotal: offer.professionalTotal, totalPriceClp: offer.baseCycleAmount, snapshotHash: offer.contractHash,
    }});
    return tx.commercialBillingOperation.create({data: {businessId: input.businessId, subscriptionId: snapshot.id, provider: "MERCADO_PAGO", environment: provider.config.environment,
      kind: offer.mode === "EXTENSION" ? "CONTRACT_CHANGE" : "NEW_SUBSCRIPTION", strategy: "IMMEDIATE", status: "PREPARED", idempotencyKey: key,
      inputHash: commercialHash(q), previousContractHash: offer.contractHash, targetPlanCode: "PURAGENDA_PLUS", targetProfessionalTotal: offer.professionalTotal,
      quoteSnapshot: commercialJson(q), recurringAmountMinor: offer.total, expectedPaymentMinor: offer.amountDue, taxAmountMinor: includedVat(offer.amountDue).vat,
      effectiveAt: offer.firstChargeAt, providerSubscriptionId: offer.manual ? null : sub.mpSubscriptionId}});
  });
}
export async function executeLegacyPlusCheckout(businessId: string, operationId: string, payerEmail: string, provider = createMpV2Provider()) {
  const op = await prisma.commercialBillingOperation.findFirstOrThrow({where: {id: operationId, businessId, environment: provider.config.environment}}), q = saved(op);
  if (op.status !== "PREPARED") return legacyPlusOperationView(op, provider);
  await provider.checkAccount();
  const business = await readLegacyPlusBusiness(businessId); assertBusiness(business, q.acceptedBy);
  if (legacyPlusSourceHash(business) !== q.sourceHash) throw new Error("LEGACY_PLUS_CONTRACT_CHANGED");
  const claimed = await prisma.commercialBillingOperation.updateMany({where: {id: op.id, status: "PREPARED"}, data: {status: "EXECUTING", executionStartedAt: new Date()}});
  if (!claimed.count) return {operationId, status: "EXECUTING", checkoutUrl: null};
  try {
    let checkoutUrl: string, providerId = op.providerSubscriptionId, providerOperationId: string;
    if (q.mode === "EXTENSION") {
      const preference = z.object({id: z.string(), init_point: z.string(), sandbox_init_point: z.string().optional()}).parse(await provider.port.preference({
        items: [{id: op.id, title: "Cambio a Puragenda+ · período restante", quantity: 1, currency_id: "CLP", unit_price: op.expectedPaymentMinor!}],
        payer: {email: payerEmail}, external_reference: reference(op.id),
        notification_url: new URL("/api/webhooks/mercadopago-legacy-plus", provider.config.webhookUrl).href,
        back_urls: {success: provider.config.returnUrl, failure: provider.config.returnUrl, pending: provider.config.returnUrl},
        expires: true, expiration_date_to: q.periodEnd.toISOString(), payment_methods: {installments: 1},
      }, op.id));
      checkoutUrl = provider.checkoutUrl(provider.config.environment === "V2_SANDBOX" ? preference.sandbox_init_point ?? preference.init_point : preference.init_point);
      providerOperationId = preference.id;
    } else {
      const body = {reason: `Puragenda+ · ${q.selection.professionalTotal} profesionales`, external_reference: reference(op.id), payer_email: payerEmail,
        back_url: provider.config.returnUrl, auto_recurring: {frequency: q.selection.billingCycle === "ANNUAL" ? 12 : 1, frequency_type: "months" as const,
          transaction_amount: op.expectedPaymentMinor!, currency_id: "CLP", ...(q.firstChargeAt > new Date() ? {start_date: q.firstChargeAt.toISOString()} : {})}};
      const remote = providerId ? await legacySubscription(provider,providerId) : null;
      if (remote && !["pending", "authorized", "paused"].includes(remote.status)) throw new Error("LEGACY_PLUS_PROVIDER_STATE_REVIEW");
      const created = provider.validateSubscription(remote
        ? await provider.port.update(remote.id, body)
        : await provider.port.create({...body, status: "pending"}, op.id));
      if (created.external_reference !== reference(op.id) || created.auto_recurring.transaction_amount !== op.expectedPaymentMinor || created.auto_recurring.frequency !== body.auto_recurring.frequency ||
          (q.firstChargeAt > new Date() && (!created.auto_recurring.start_date || Math.abs(+created.auto_recurring.start_date - +q.firstChargeAt) > 1000))) throw new Error("LEGACY_PLUS_PROVIDER_BINDING_MISMATCH");
      providerId = created.id; providerOperationId = created.id; checkoutUrl = provider.checkoutUrl(created.init_point!, created.id);
    }
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
      const current = await readLegacyPlusBusiness(businessId, tx);
      if (legacyPlusSourceHash(current) !== q.sourceHash) throw new Error("LEGACY_PLUS_CONTRACT_CHANGED");
      const terms = {...termsFor(q, providerId, current.commercialSubscription?.termsSnapshot), basePlan: current.subscription!.plan};
      const updated = await tx.commercialSubscription.update({where: {id: op.subscriptionId}, data: {termsSnapshot: commercialJson(terms), provider: q.manual ? "BANK_TRANSFER" : "MERCADO_PAGO", externalSubscriptionId: providerId,
        ...(isTrialCurrentlyActive(current.subscription) ? {planCode: "PURAGENDA_PLUS", status: "TRIALING", trialStart: current.subscription!.createdAt,
          trialEnd: current.subscription!.trialEndsAt, periodStart: current.subscription!.createdAt, periodEnd: current.subscription!.trialEndsAt, totalPriceClp: op.recurringAmountMinor} : {})}});
      if (updated.planCode === "PURAGENDA_PLUS") await materializeCommercialEntitlements(tx, updated);
      if (q.mode === "COMBINED" && providerId && !q.manual) await tx.subscription.update({where: {id: q.baseSubscriptionId}, data: {mpSubscriptionId: providerId}});
      await tx.commercialBillingOperation.update({where: {id: op.id}, data: {status: "AWAITING_PAYMENT", providerSubscriptionId: providerId, providerOperationId, providerPreview: commercialJson({checkoutUrl})}});
    });
  } catch {
    await prisma.commercialBillingOperation.updateMany({where: {id: op.id, status: "EXECUTING"}, data: {status: "UNKNOWN", failureCode: "LEGACY_PLUS_PROVIDER_RESULT_UNKNOWN"}});
  }
  return legacyPlusOperationView(await prisma.commercialBillingOperation.findUniqueOrThrow({where: {id: op.id}}), provider);
}

async function ownedOperation(businessId: string, id: string, provider: MpV2Provider) {
  const op = await prisma.commercialBillingOperation.findFirstOrThrow({where: {id, businessId, provider: "MERCADO_PAGO", environment: provider.config.environment}});
  saved(op); return op;
}
function confirmedPayment(payment: MpV2Payment) {
  return payment.status === "approved" && payment.transaction_amount_refunded === 0 && !!payment.date_approved && payment.date_approved <= new Date();
}
async function persistPlusPayment(op: CommercialBillingOperation, payment: MpV2Payment, periodStart: Date, periodEnd: Date, provider: MpV2Provider, combinedRecurring: boolean) {
  const q = saved(op);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${op.businessId} FOR UPDATE`;
    const business = await readLegacyPlusBusiness(op.businessId, tx); assertBusiness(business, q.acceptedBy);
    const prior = await tx.commercialPaymentEvidence.findUnique({where: {provider_paymentId: {provider: "MERCADO_PAGO", paymentId: payment.id}}});
    if (prior && (prior.operationId !== op.id || prior.businessId !== op.businessId || prior.amountMinor !== payment.transaction_amount)) throw new Error("LEGACY_PLUS_EVIDENCE_CONFLICT");
    const state = payment.transaction_amount_refunded > 0 || payment.status === "refunded" ? "REFUNDED" : payment.status === "charged_back" ? "CHARGEBACK" : confirmedPayment(payment) ? "CONFIRMED" : payment.status === "rejected" || payment.status === "cancelled" ? "REJECTED" : "PENDING";
    if (prior && ["REFUNDED", "CHARGEBACK"].includes(prior.status) && state === "CONFIRMED") return;
    if (prior && prior.occurredAt > payment.date_last_updated) return;
    if (prior?.status === state) return;
    const event = await tx.commercialEvent.upsert({where: {source_eventId: {source: "legacy_plus_payment", eventId: `${payment.id}:${state}`}}, update: {}, create: {
      businessId: op.businessId, subscriptionId: op.subscriptionId, source: "legacy_plus_payment", eventId: `${payment.id}:${state}`, operation: "PAYMENT_RECONCILED",
      outcome: "APPLIED", occurredAt: payment.date_last_updated, payloadHash: commercialHash({id: payment.id, state, amount: payment.transaction_amount}),
      details: commercialJson({operationId: op.id, amount: payment.transaction_amount, currency: "CLP", environment: provider.config.environment}),
    }});
    await tx.commercialPaymentEvidence.upsert({where: {provider_paymentId: {provider: "MERCADO_PAGO", paymentId: payment.id}}, update: {status: state, occurredAt: payment.date_last_updated, eventId: event.id}, create: {
      businessId: op.businessId, operationId: op.id, provider: "MERCADO_PAGO", paymentId: payment.id, status: state, origin: `${provider.config.environment}_PROVIDER`,
      amountMinor: payment.transaction_amount, currencyCode: "CLP", periodStart, periodEnd, occurredAt: payment.date_last_updated,
      eventId: event.id, providerSubscriptionId: op.providerSubscriptionId,
    }});
    if (state === "CONFIRMED") {
      const current = business.commercialSubscription!;
      if (current.lastPaymentAt && payment.date_approved! < current.lastPaymentAt) return;
      const terms = {...termsFor(q, op.providerSubscriptionId, current.termsSnapshot), basePlan: business.subscription!.plan, combinedRecurring};
      const updated = await tx.commercialSubscription.update({where: {id: op.subscriptionId}, data: {
        planCode: "PURAGENDA_PLUS", status: "ACTIVE", professionalTotal: getStaffLimit(business.subscription), basePriceClp: q.baseCycleAmount,
        totalPriceClp: q.baseCycleAmount + q.upgradeCycleAmount, billingCycle: q.selection.billingCycle, periodStart, periodEnd, renewalAt: periodEnd,
        trialStart: null, trialEnd: null, termsSnapshot: commercialJson(terms), snapshotHash: commercialHash({terms, payment: payment.id, periodStart, periodEnd}),
        lastPaymentStatus: "CONFIRMED", lastPaymentAt: payment.date_approved, lastPaymentEventId: event.id, lastReconciledAt: new Date(),
      }});
      await materializeCommercialEntitlements(tx, updated);
      await tx.commercialBillingOperation.update({where: {id: op.id}, data: {status: "APPLIED", appliedAt: op.appliedAt ?? new Date(), failureCode: null}});
    } else if (["REFUNDED", "CHARGEBACK"].includes(state) && business.commercialSubscription && business.commercialSubscription.lastPaymentEventId === prior?.eventId) {
      const terms = legacyPlusTerms(business.commercialSubscription.termsSnapshot)!;
      const updated = await tx.commercialSubscription.update({where: {id: op.subscriptionId}, data: {status: "INACTIVE", lastPaymentStatus: state, termsSnapshot: commercialJson({...terms, combinedRecurring: false})}});
      await materializeCommercialEntitlements(tx, updated);
      await tx.commercialBillingOperation.update({where: {id: op.id}, data: {status: "REJECTED", failureCode: payment.transaction_amount_refunded > 0 && payment.transaction_amount_refunded < payment.transaction_amount ? "LEGACY_PLUS_PARTIAL_REFUND_REVIEW" : null}});
    }
  });
}
async function synchronizeLegacyPlusRenewal(businessId: string, provider: MpV2Provider, restoreBase = false) {
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    const business = await readLegacyPlusBusiness(businessId,tx), s = business.subscription!, terms = legacyPlusTerms(business.commercialSubscription?.termsSnapshot);
    if (!terms || (!terms.combinedRecurring && !restoreBase) || s.paymentMethod === "BANK_TRANSFER" || !s.mpSubscriptionId) return;
    const base = calculateNextBillingPreview(s);
    const expected = terms.cancelAt || restoreBase ? base.mpAmount : base.amountDue + terms.upgradeCycleAmount;
    const remote = await legacySubscription(provider,s.mpSubscriptionId);
    if (remote.auto_recurring.transaction_amount !== expected) await provider.port.update(remote.id, {auto_recurring: {transaction_amount: expected, currency_id: "CLP"}});
    const canonical = await legacySubscription(provider,remote.id);
    if (canonical.auto_recurring.transaction_amount !== expected) throw new Error("LEGACY_PLUS_RENEWAL_UNCONFIRMED");
  },{maxWait:2000,timeout:35000});
}
export async function reconcileLegacyPlusPreference(businessId: string, operationId: string, paymentId: string, provider = createMpV2Provider()) {
  await provider.checkAccount(); const op = await ownedOperation(businessId, operationId, provider), q = saved(op), payment = await provider.payment(paymentId);
  if (q.mode !== "EXTENSION" || payment.external_reference !== reference(op.id) || payment.transaction_amount !== op.expectedPaymentMinor) throw new Error("LEGACY_PLUS_PAYMENT_BINDING_MISMATCH");
  if (payment.date_approved && (payment.date_approved < q.acceptedAt || payment.date_approved >= q.periodEnd)) throw new Error("LEGACY_PLUS_PAYMENT_PERIOD_MISMATCH");
  await persistPlusPayment(op, payment, q.acceptedAt, q.periodEnd, provider, !q.manual && !!op.providerSubscriptionId);
  if (confirmedPayment(payment)) {
    try { await synchronizeLegacyPlusRenewal(businessId, provider); }
    catch { await prisma.commercialBillingOperation.update({where: {id: op.id}, data: {status: "PAID", failureCode: "LEGACY_PLUS_RENEWAL_UNCONFIRMED"}}); }
  } else if (payment.status === "refunded" || payment.status === "charged_back" || payment.transaction_amount_refunded > 0) {
    const current = await readLegacyPlusBusiness(businessId);
    if (current.commercialSubscription?.lastPaymentStatus !== "CONFIRMED") await synchronizeLegacyPlusRenewal(businessId, provider, true);
  }
}

export async function cancelLegacyPlus(businessId: string, actorId: string, provider = createMpV2Provider()) {
  await provider.checkAccount();
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    const business = await readLegacyPlusBusiness(businessId, tx); assertBusiness(business, actorId);
    const snapshot = business.commercialSubscription, terms = legacyPlusTerms(snapshot?.termsSnapshot);
    if (!snapshot || !terms) throw new Error("LEGACY_PLUS_OPERATION_NOT_FOUND");
    const cancelAt = snapshot.periodEnd ?? snapshot.trialEnd ?? new Date();
    await tx.commercialSubscription.update({where: {id: snapshot.id}, data: {termsSnapshot: commercialJson({...terms, cancelAt: cancelAt.toISOString()}), renewalCancellationStatus: "REQUESTED", renewalCancellationRequestedAt: new Date()}});
    await tx.commercialBillingOperation.updateMany({where: {subscriptionId: snapshot.id, status: {in: open}}, data: {status: "CANCELLED"}});
    await tx.auditLog.create({data: {userId: actorId, action: "LEGACY_PLUS_RENEWAL_CANCELLED", details: JSON.stringify({businessId, baseSubscriptionUnchanged: true, validUntil: cancelAt})}});
  });
  await synchronizeLegacyPlusRenewal(businessId, provider, true);
  await prisma.commercialSubscription.update({where: {businessId}, data: {renewalCancellationStatus: "CANCELLED_VERIFIED",renewalCancelledAt:new Date(),renewalAt:null}});
  return {status: "CANCELLED", baseSubscriptionPreserved: true};
}

/** Called only with a provider-fetched invoice. Canonical payment/account binding
 * is repeated here before either the original base ledger or Plus is advanced. */
export async function reconcileLegacyPlusInvoice(invoice: MercadoPagoInvoiceSnapshot, provider?: MpV2Provider) {
  if (!invoice.preapproval_id || process.env.PURAGENDA_NEXT_ENABLED !== "1") return false;
  const snapshot = await prisma.commercialSubscription.findFirst({where: {externalSubscriptionId: invoice.preapproval_id}});
  const terms = legacyPlusTerms(snapshot?.termsSnapshot); if (!snapshot || !terms || !terms.combinedRecurring) return false;
  const mp = provider ?? createMpV2Provider(); await mp.checkAccount();
  const canonical = z.object({id:z.union([z.string(),z.number()]).transform(String),preapproval_id:z.string(),debit_date:z.coerce.date(),currency_id:z.literal("CLP"),transaction_amount:z.number().int().nonnegative(),payment:z.object({id:z.union([z.string(),z.number()]).transform(String).nullish()}).nullish()}).parse(await mp.port.invoice(String(invoice.id)));
  if(canonical.id!==String(invoice.id)||canonical.preapproval_id!==invoice.preapproval_id||canonical.payment?.id!==String(invoice.payment?.id))throw new Error("LEGACY_PLUS_INVOICE_BINDING_MISMATCH");
  const remote = await legacySubscription(mp,canonical.preapproval_id);
  if (remote.id !== terms.providerSubscriptionId || !invoice.payment?.id || !invoice.id) throw new Error("LEGACY_PLUS_INVOICE_BINDING_MISMATCH");
  const payment = await mp.payment(String(invoice.payment.id));
  const business = await readLegacyPlusBusiness(snapshot.businessId), s = business.subscription!;
  const root = await prisma.commercialBillingOperation.findFirstOrThrow({where: {subscriptionId: snapshot.id, environment: mp.config.environment,
    providerSubscriptionId: remote.id, quoteSnapshot: {path: ["origin"], equals: "legacy_plus_checkout"}}, orderBy: {createdAt: "desc"}});
  const quote=saved(root);
  if(+canonical.debit_date < +quote.firstChargeAt-60_000)return false;
  const extension = terms.cancelAt && canonical.debit_date >= new Date(terms.cancelAt) ? 0 : terms.upgradeCycleAmount;
  const basePreview = calculateNextBillingPreview(s), base = extension ? basePreview.amountDue : basePreview.mpAmount;
  const already = await prisma.commercialPaymentEvidence.findUnique({where: {provider_paymentId: {provider: "MERCADO_PAGO", paymentId: payment.id}}});
  if(!already&&root.appliedAt&&canonical.debit_date<root.appliedAt&&canonical.transaction_amount===base)return false;
  if (!already && (payment.transaction_amount !== base + extension || canonical.transaction_amount !== payment.transaction_amount)) throw new Error("LEGACY_PLUS_INVOICE_AMOUNT_MISMATCH");
  if (already && already.amountMinor !== payment.transaction_amount) throw new Error("LEGACY_PLUS_EVIDENCE_CONFLICT");
  const start = canonical.debit_date, end = endOf(start, s.billingCycle);
  if (start > new Date() || +start < +quote.firstChargeAt-60_000 || (payment.external_reference&&remote.external_reference&&payment.external_reference!==remote.external_reference) || (payment.date_approved && payment.date_approved > new Date())) throw new Error("LEGACY_PLUS_PAYMENT_PERIOD_MISMATCH");
  if (confirmedPayment(payment)) {
    await processMercadoPagoInvoice({...invoice, payment: {...invoice.payment, id: payment.id, status: "approved"}}, new Date(), extension);
    if (extension) await persistPlusPayment(root, payment, start, end, mp, true);
  } else if (payment.status === "refunded" || payment.status === "charged_back" || payment.transaction_amount_refunded > 0) {
    await persistPlusPayment(root, payment, start, end, mp, true);
    const current=await readLegacyPlusBusiness(snapshot.businessId);
    if(current.commercialSubscription?.lastPaymentStatus!=="CONFIRMED")await synchronizeLegacyPlusRenewal(snapshot.businessId,mp,true);
  } else await processMercadoPagoInvoice({...invoice, payment: {...invoice.payment, id: payment.id, status: payment.status}}, new Date(), extension);
  return true;
}

/** Bounded recovery supplements signed webhooks. It never creates a checkout
 * after an uncertain result, and never processes a different environment. */
export async function runLegacyPlusRecovery(provider?: MpV2Provider) {
  if(process.env.PURAGENDA_NEXT_ENABLED!=="1"||process.env.PURAGENDA_MP_V2_RECOVERY_ENABLED!=="1")return {completed:0,failed:0};
  const mp=provider??createMpV2Provider({timeoutMs:1500}),deadline=Date.now()+8000;
  const operations=await prisma.commercialBillingOperation.findMany({where:{environment:mp.config.environment,provider:"MERCADO_PAGO",quoteSnapshot:{path:["origin"],equals:"legacy_plus_checkout"},status:{in:["EXECUTING","UNKNOWN","AWAITING_PAYMENT","PAID","APPLIED"]}},orderBy:{updatedAt:"asc"},take:2});
  let completed=0,failed=0;
  for(const op of operations){if(Date.now()>=deadline)break;try{
    await reconcileLegacyPlusOperation(op.businessId,op.id,mp);
    const q=saved(op);if(q.mode==="EXTENSION"&&op.providerSubscriptionId){for(const invoice of await mp.invoices(op.providerSubscriptionId)){
      if(Date.now()>=deadline)break;
      await reconcileLegacyPlusInvoice({...invoice,debit_date:invoice.debit_date.toISOString(),payment:invoice.payment?.id?{id:invoice.payment.id}:undefined},mp);
    }}
    completed++;
  }catch{failed++;}finally{await prisma.commercialBillingOperation.update({where:{id:op.id},data:{updatedAt:new Date()}});}}
  return {completed,failed};
}
export async function reconcileLegacyPlusOperation(businessId: string, operationId: string, provider = createMpV2Provider()) {
  const op = await ownedOperation(businessId, operationId, provider), q = saved(op);
  await provider.checkAccount();
  if (op.status === "PREPARED") {
    const owner = await prisma.business.findUniqueOrThrow({where: {id: businessId}, select: {owner: {select: {email: true}}}});
    if (!owner.owner) throw new Error("OWNER_REQUIRED");
    return executeLegacyPlusCheckout(businessId, operationId, owner.owner.email, provider);
  }
  if (q.mode === "EXTENSION") {
    const result = z.object({results: z.array(z.object({id: z.union([z.string(), z.number()]).transform(String)}))}).parse(await provider.port.payments(reference(op.id)));
    for (const row of result.results) await reconcileLegacyPlusPreference(businessId, op.id, row.id, provider);
    if (op.status === "PAID") { await synchronizeLegacyPlusRenewal(businessId, provider); await prisma.commercialBillingOperation.update({where: {id: op.id}, data: {status: "APPLIED", failureCode: null}}); }
  } else {
    let providerId = op.providerSubscriptionId;
    if (!providerId || ["UNKNOWN","EXECUTING"].includes(op.status)) {
      const result = z.object({results: z.array(z.unknown())}).parse(await provider.port.search(reference(op.id)));
      const matches = result.results.map(row => provider.validateSubscription(row)).filter(row => row.external_reference === reference(op.id));
      if (matches.length !== 1) return legacyPlusOperationView(op, provider);
      providerId = matches[0].id;
      await prisma.commercialBillingOperation.update({where: {id: op.id}, data: {providerSubscriptionId: providerId, status: "AWAITING_PAYMENT"}});
      const current=await readLegacyPlusBusiness(businessId);
      const terms={...termsFor(q,providerId,current.commercialSubscription?.termsSnapshot),basePlan:current.subscription!.plan};
      await prisma.commercialSubscription.update({where: {id: op.subscriptionId}, data: {externalSubscriptionId: providerId,termsSnapshot:commercialJson(terms)}});
      if(!q.manual)await prisma.subscription.update({where:{id:q.baseSubscriptionId},data:{mpSubscriptionId:providerId}});
    }
    const remote = await legacySubscription(provider,providerId);
    if (remote.external_reference !== reference(op.id)) throw new Error("LEGACY_PLUS_PROVIDER_BINDING_MISMATCH");
    if(["pending","authorized"].includes(remote.status)&&remote.init_point&&op.status!=="APPLIED")await prisma.commercialBillingOperation.update({where:{id:op.id},data:{status:"AWAITING_PAYMENT",providerPreview:commercialJson({checkoutUrl:provider.checkoutUrl(remote.init_point,remote.id)})}});
    for (const invoice of await provider.invoices(providerId)) await reconcileLegacyPlusInvoice({...invoice, debit_date: invoice.debit_date.toISOString(), payment: invoice.payment?.id ? {id: invoice.payment.id} : undefined}, provider);
  }
  return legacyPlusOperationView(await ownedOperation(businessId, operationId, provider), provider);
}
export async function handleLegacyPlusWebhook(raw: string, headers: Headers, queryId: string | null, provider = createMpV2Provider()) {
  const notification = provider.verifyWebhook(raw, headers, queryId); await provider.checkAccount();
  if (notification.type === "payment") {
    const payment = await provider.payment(notification.resourceId);
    if (!payment.external_reference?.startsWith("legacy_plus_")) throw new Error("LEGACY_PLUS_OPERATION_NOT_FOUND");
    const op = await prisma.commercialBillingOperation.findFirstOrThrow({where: {id: payment.external_reference.slice(12), environment: provider.config.environment, provider: "MERCADO_PAGO"}});
    await reconcileLegacyPlusPreference(op.businessId, op.id, payment.id, provider);
  } else if (notification.type === "subscription_authorized_payment") {
    const invoice = await provider.port.invoice(notification.resourceId) as MercadoPagoInvoiceSnapshot;
    if (String(invoice.id) !== notification.resourceId || !await reconcileLegacyPlusInvoice(invoice, provider)) throw new Error("LEGACY_PLUS_OPERATION_NOT_FOUND");
  } else {
    const remote = await legacySubscription(provider,notification.resourceId);
    if (!remote.external_reference.startsWith("legacy_plus_")) throw new Error("LEGACY_PLUS_OPERATION_NOT_FOUND");
    const op = await prisma.commercialBillingOperation.findFirstOrThrow({where: {id: remote.external_reference.slice(12), environment: provider.config.environment}});
    await reconcileLegacyPlusOperation(op.businessId, op.id, provider);
  }
}
