import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { TRIAL_DURATION_DAYS } from "@/core/constants";
import { COMMERCIAL_CATALOG_VERSION, quoteCommercialContract } from "@/core/commercial-catalog";
import { commercialSelectionSchema, type CommercialSelection } from "@/core/commercial-selection";
export { commercialSelectionSchema, type CommercialSelection } from "@/core/commercial-selection";
import { commercialHash } from "./commercial-internal";
import { commercialJson, materializeCommercialEntitlements } from "./commercial-subscription-v2.service";
import { effectiveSnapshotAccess } from "./commercial-plan-access";
import { REGISTRATION_COUNTRY, REGISTRATION_CURRENCY } from "@/core/registration-market";

function contractTerms(selection: CommercialSelection) {
  const quote = quoteCommercialContract({ ...selection, catalogVersion: COMMERCIAL_CATALOG_VERSION });
  return { quote, terms: { origin: "registration_v2", vatIncluded: true, annualPaidMonths: quote.billingCycle === "ANNUAL" ? quote.paidMonths : null,
    annualFreeMonths: quote.billingCycle === "ANNUAL" ? quote.freeMonths : 0, quote } };
}
async function writeItems(tx: Prisma.TransactionClient, subscriptionId: string, selection: CommercialSelection, now: Date) {
  const { quote } = contractTerms(selection);
  await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId, effectiveTo: null }, data: { effectiveTo: now } });
  await tx.commercialSubscriptionItem.createMany({ data: [
    { subscriptionId, kind: "BASE_PLAN", code: selection.plan, quantity: 1, unitAmountClp: quote.baseMonthly,
      amountClp: quote.billingCycle === "ANNUAL" ? quote.baseMonthly * quote.paidMonths : quote.baseMonthly,
      currencyCode: "CLP", catalogVersion: quote.catalogVersion, effectiveFrom: now, pricingSnapshot: commercialJson(quote) },
    { subscriptionId, kind: "PROFESSIONAL_SEATS", code: "professional_seats", quantity: selection.professionalTotal, unitAmountClp: null,
      amountClp: quote.cycleTotal - (quote.billingCycle === "ANNUAL" ? quote.baseMonthly * quote.paidMonths : quote.baseMonthly),
      currencyCode: "CLP", catalogVersion: quote.catalogVersion, effectiveFrom: now, pricingSnapshot: commercialJson(quote.surchargeSteps) },
  ] });
}

/** Registration already holds its identity lock. Never calls a payment provider. */
export async function createRegistrationContract(tx: Prisma.TransactionClient, input: CommercialSelection & { businessId: string; trialEligible: boolean; now?: Date }) {
  const business = await tx.business.findUniqueOrThrow({ where: { id: input.businessId }, select: { countryCode: true, currencyCode: true } });
  if (business.countryCode !== REGISTRATION_COUNTRY || business.currencyCode !== REGISTRATION_CURRENCY) {
    throw new Error("REGISTRATION_MARKET_UNSUPPORTED");
  }
  const selection = commercialSelectionSchema.parse({ plan: input.plan, professionalTotal: input.professionalTotal, billingCycle: input.billingCycle });
  const now = input.now ?? new Date();
  const { quote, terms } = contractTerms(selection);
  const existing = await tx.commercialSubscription.findUnique({ where: { businessId: input.businessId } });
  if (existing) throw new Error("REGISTRATION_CONTRACT_ALREADY_EXISTS");
  const trialEnd = input.trialEligible ? new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000) : null;
  await tx.subscription.create({ data: {
    businessId: input.businessId, plan: selection.plan, billingCycle: selection.billingCycle,
    status: trialEnd ? "TRIALING" : "INACTIVE", isTrial: !!trialEnd, trialEndsAt: trialEnd,
    extraStaffCount: selection.professionalTotal - 1, staffLimitOverride: selection.professionalTotal, currentPeriodEnd: trialEnd,
  } });
  const snapshotHash = commercialHash({ selection, terms, trialStart: trialEnd ? now : null, trialEnd });
  const snapshot = await tx.commercialSubscription.create({ data: {
    businessId: input.businessId, planCode: selection.plan,
    catalogVersion: quote.catalogVersion, professionalTotal: selection.professionalTotal, billingCycle: selection.billingCycle,
    status: trialEnd ? "TRIALING" : "INACTIVE", provider: "NONE", currencyCode: "CLP",
    trialStart: trialEnd ? now : null, trialEnd, periodStart: trialEnd ? now : null, periodEnd: trialEnd,
    renewalAt: null, basePriceClp: quote.baseMonthly, totalPriceClp: quote.cycleTotal,
    termsSnapshot: commercialJson(terms), snapshotHash,
  } });
  await writeItems(tx, snapshot.id, selection, now);
  await materializeCommercialEntitlements(tx, snapshot, now);
  await tx.commercialEvent.create({ data: { businessId: input.businessId, subscriptionId: snapshot.id,
    source: "registration_v2", eventId: input.businessId, operation: trialEnd ? "TRIAL_STARTED" : "TRIAL_INELIGIBLE",
    outcome: "APPLIED", payloadHash: snapshotHash, occurredAt: now, details: commercialJson({ selection, trialEnd }) } });
  return snapshot;
}

/** Only an owner may change an active free trial. Its original deadline never moves. */
export async function changeCommercialTrial(input: CommercialSelection & { businessId: string; actorId: string; idempotencyKey: string }, now = new Date()) {
  const selection = commercialSelectionSchema.parse({ plan: input.plan, professionalTotal: input.professionalTotal, billingCycle: input.billingCycle });
  if (!input.idempotencyKey || input.idempotencyKey.length > 100) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  const payloadHash = commercialHash(selection);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${input.businessId} FOR UPDATE`;
    const owner = await tx.business.findFirst({ where: { id: input.businessId, ownerId: input.actorId, deletedAt: null, owner: { deletedAt: null } }, select: { id: true } });
    if (!owner) throw new Error("OWNER_REQUIRED");
    const eventId = `${input.businessId}:${input.idempotencyKey}`;
    const prior = await tx.commercialEvent.findUnique({ where: { source_eventId: { source: "trial_selection", eventId } } });
    if (prior) { if (prior.payloadHash !== payloadHash) throw new Error("IDEMPOTENCY_CONFLICT"); return { duplicate: true }; }
    const current = await tx.commercialSubscription.findUniqueOrThrow({ where: { businessId: input.businessId } });
    if (await tx.commercialBillingOperation.findFirst({ where: { businessId: input.businessId, environment: { in: ["V2_SANDBOX", "V2_PRODUCTION"] }, status: { in: ["PREPARED", "EXECUTING", "UNKNOWN", "AWAITING_PAYMENT", "SCHEDULED"] } } })) throw new Error("V2_OPERATION_ALREADY_OPEN");
    if (current.status !== "TRIALING" || !effectiveSnapshotAccess(current, now).commercialAccess) throw new Error("ACTIVE_TRIAL_REQUIRED");
    if (await tx.staff.count({ where: { businessId: input.businessId, isActive: true } }) > selection.professionalTotal) throw new Error("ACTIVE_PROFESSIONALS_EXCEED_SELECTION");
    const { quote, terms } = contractTerms(selection);
    const snapshot = await tx.commercialSubscription.update({ where: { id: current.id }, data: {
      planCode: selection.plan, professionalTotal: selection.professionalTotal, billingCycle: selection.billingCycle,
      basePriceClp: quote.baseMonthly, totalPriceClp: quote.cycleTotal, termsSnapshot: commercialJson(terms),
      snapshotHash: commercialHash({ selection, terms, trialStart: current.trialStart, trialEnd: current.trialEnd }),
    } });
    await tx.subscription.update({ where: { businessId: input.businessId }, data: {
      plan: selection.plan, billingCycle: selection.billingCycle, staffLimitOverride: selection.professionalTotal, extraStaffCount: selection.professionalTotal - 1,
    } });
    await writeItems(tx, snapshot.id, selection, now);
    await materializeCommercialEntitlements(tx, snapshot, now);
    await tx.commercialEvent.create({ data: { source: "trial_selection", eventId, businessId: input.businessId, subscriptionId: snapshot.id,
      operation: "TRIAL_SELECTION_CHANGED", outcome: "APPLIED", occurredAt: now, payloadHash, details: commercialJson(selection) } });
    return { duplicate: false };
  });
}

export async function expireCommercialTrial(businessId: string, now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    const current = await tx.commercialSubscription.findUnique({ where: { businessId } });
    if (!current || current.status !== "TRIALING" || !current.trialEnd || current.trialEnd > now) return false;
    const snapshot = await tx.commercialSubscription.update({ where: { id: current.id }, data: { status: "INACTIVE" } });
    await tx.subscription.updateMany({ where: { businessId, status: "TRIALING" }, data: { status: "INACTIVE", isTrial: false } });
    await materializeCommercialEntitlements(tx, snapshot, now);
    await tx.commercialEvent.create({ data: { source: "trial_expiry", eventId: current.id, businessId, subscriptionId: current.id,
      operation: "TRIAL_EXPIRED", outcome: "APPLIED", occurredAt: now, payloadHash: current.snapshotHash } });
    return true;
  });
}
