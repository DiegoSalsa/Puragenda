import type { Prisma } from "@prisma/client";
import { quoteCommercialPlan, quoteLegacyPlan, getCommercialPlanMetadata } from "@/core/commercial-catalog";
import { getStaffLimit } from "@/core/subscription-plan";
import { prisma } from "@/server/db/prisma";
import { commercialHash, ACTIVE_COMMERCIAL_MIGRATION_STATES } from "@/server/services/commercial-internal";
import { websitePriceTier, WEBSITE_CATALOG } from "@/websites/offers";
import type { ProviderPreview, SandboxBillingAdapter, BillingContext } from "@/server/commercial-billing/contracts";
import { createMercadoPagoSandboxAdapter } from "@/server/commercial-billing/mercadopago-sandbox";
import { createPaddleSandboxAdapter } from "@/server/commercial-billing/paddle-sandbox";

export const ACTIVE_MIGRATION_STATES = ACTIVE_COMMERCIAL_MIGRATION_STATES;
export type MigrationRequest = { plan: string; professionalTotal: number; effectiveAt: Date };
export type MigrationDependencies = {
  adapter?: SandboxBillingAdapter;
  // Test harness only. No owner-facing API accepts these policy decisions.
  fixtureReview?: { tax: true; renewal: true; specialTerms: true };
};
type SourceDb = Pick<Prisma.TransactionClient, "business" | "staff" | "commercialSubscription" | "subscription" | "websiteAddon" | "businessWebsite" | "websiteOfferEligibility" | "affiliate" | "seatChangeRequest" | "commercialBillingOperation">;
export async function readMigrationSource(businessId: string, db: SourceDb = prisma) {
  const [business, legacy, commercial, addon, offer, website, activeProfessionals, affiliate, seats, billing] = await Promise.all([
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { id: true, ownerId: true, deletedAt: true, currencyCode: true } }),
    db.subscription.findUnique({ where: { businessId } }),
    db.commercialSubscription.findUnique({ where: { businessId }, include: { items: { orderBy: { id: "asc" } } } }),
    db.websiteAddon.findUnique({ where: { businessId }, include: { checkoutOperations: { where: { state: { in: ["CREATING", "UNKNOWN", "CHECKOUT_PENDING"] } }, orderBy: { id: "asc" } } } }),
    db.websiteOfferEligibility.findUnique({ where: { businessId } }),
    db.businessWebsite.findUnique({ where: { businessId }, select: { id: true, subdomain: true, status: true, domains: { orderBy: { id: "asc" }, select: { id: true, hostname: true, status: true, tenantVerifiedAt: true } } } }),
    db.staff.count({ where: { businessId, isActive: true } }),
    db.affiliate.findUnique({ where: { businessId }, select: { paidReferrals: true, spentTokens: true, prizes: { orderBy: { id: "asc" } } } }),
    db.seatChangeRequest.findMany({ where: { businessId, status: { in: ["DRAFT", "PENDING_PAYMENT", "SCHEDULED", "UNKNOWN"] } }, orderBy: { id: "asc" }, select: { id: true } }),
    db.commercialBillingOperation.findMany({ where: { businessId, status: { in: ["PREPARED", "SCHEDULED", "EXECUTING", "UNKNOWN", "AWAITING_PAYMENT", "PAID"] } }, orderBy: { id: "asc" }, select: { id: true } }),
  ]);
  if (business.deletedAt || !commercial) throw new Error("COMMERCIAL_SNAPSHOT_REQUIRED");
  const terms = legacy ? { ...legacy, billingNotes: undefined, billingNotesHash: legacy.billingNotes ? commercialHash(legacy.billingNotes) : null } : null;
  const source = { business, legacy: terms, commercial, addon, offer, website, activeProfessionals, affiliate, seats, billing };
  return { ...source, fingerprint: commercialHash(source) };
}
export type MigrationSource = Awaited<ReturnType<typeof readMigrationSource>>;
export function migrationAdapter(provider: string) {
  if (provider === "MERCADO_PAGO") return createMercadoPagoSandboxAdapter();
  if (provider === "PADDLE") return createPaddleSandboxAdapter();
  throw new Error("PROVIDER_MIGRATION_REQUIRES_REVIEW");
}
export function migrationContext(id: string, businessId: string, request: MigrationRequest, externalId: string | null): BillingContext {
  return { operationId: id, businessId, quote: quoteCommercialPlan({ ...request, catalogVersion: "puragenda-next-v1" }),
    strategy: "NEXT_RENEWAL", effectiveAt: request.effectiveAt, providerSubscriptionId: externalId };
}
export function comparablePreview(preview: ProviderPreview) { return { ...preview, previewedAt: undefined }; }
export function addonReference(source: MigrationSource) {
  const addon = source.addon;
  return addon?.provider === "paddle" ? addon.paddleSubscriptionId : addon?.provider === "mercadopago" ? addon.mpSubscriptionId : null;
}
export async function buildMigrationPreview(source: MigrationSource, request: MigrationRequest, id: string, dependencies: MigrationDependencies = {}, now = new Date()) {
  const { commercial: current, legacy, addon } = source;
  const quote = quoteCommercialPlan({ ...request, catalogVersion: "puragenda-next-v1" });
  const metadata = getCommercialPlanMetadata(current.planCode);
  const blockers: string[] = [];
  const reviewed = dependencies.adapter?.origin === "CONTRACT_FIXTURE" && process.env.COMMERCIAL_V2_MIGRATION_FIXTURES === "1"
    && dependencies.fixtureReview?.tax === true && dependencies.fixtureReview.renewal === true && dependencies.fixtureReview.specialTerms === true;
  if (!reviewed) blockers.push("TAX_POLICY_UNRESOLVED", "PROVIDER_MIGRATION_NOT_VALIDATED");
  if (source.business.currencyCode !== "CLP" || current.currencyCode !== "CLP") blockers.push("INTERNATIONAL_PRICE_UNAPPROVED");
  if (current.billingCycle !== "MONTHLY" || legacy?.billingCycle === "ANNUAL") blockers.push("ANNUAL_MIGRATION_REQUIRES_REVIEW");
  if (current.status !== "ACTIVE" || legacy && legacy.status !== "ACTIVE") blockers.push("CURRENT_CONTRACT_NOT_ACTIVE");
  if (current.planCode === "TEST") blockers.push("LEGACY_TEST_REQUIRES_REVIEW");
  if (metadata.legacy && legacy && (current.legacySubscriptionId !== legacy.id || current.planCode !== legacy.plan
    || current.professionalTotal !== getStaffLimit(legacy))) blockers.push("LEGACY_SNAPSHOT_REQUIRES_REFRESH");
  if (!current.periodEnd || current.periodEnd <= now) blockers.push("PAID_PERIOD_UNVERIFIED");
  if (request.effectiveAt < now || !current.renewalAt || request.effectiveAt < current.renewalAt) blockers.push("EFFECTIVE_DATE_REQUIRES_RENEWAL");
  if (request.professionalTotal < source.activeProfessionals) blockers.push("ACTIVE_STAFF_CONFLICT");
  if (source.seats.length || source.billing.length) blockers.push("OTHER_COMMERCIAL_CHANGE_OPEN");
  if (legacy?.mpSubscriptionId && legacy.paddleSubscriptionId) blockers.push("MULTIPLE_BASE_PROVIDERS");
  if (!["MERCADO_PAGO", "PADDLE"].includes(current.provider) || !current.externalSubscriptionId) blockers.push("PROVIDER_MIGRATION_REQUIRES_REVIEW");
  if (legacy?.paymentMethod === "BANK_TRANSFER") blockers.push("MANUAL_PAYMENT_REQUIRES_REVIEW");
  const specialTerms = !!legacy && (legacy.customMonthlyPriceClp !== null || legacy.freeMonthsRemaining > 0 || legacy.promoFreeMonthsRemaining > 0
    || legacy.pendingDiscountPercentage !== null || legacy.promoDiscountPercentage !== null || legacy.activePrizeId !== null
    || legacy.nextBillingOverrideAmount !== null || !!legacy.promoName || legacy.staffLimitOverride !== null || legacy.hasCountedAsPaidReferral);
  if (specialTerms) blockers.push("SPECIAL_TERMS_REQUIRE_EXPLICIT_REVIEW");
  if (addon?.checkoutOperations.some(op => ["CREATING", "UNKNOWN", "CHECKOUT_PENDING"].includes(op.state))) blockers.push("WEBSITE_CHECKOUT_UNRECONCILED");
  const cleanup = request.plan === "PURAGENDA_PLUS" && !!addon && (addon.status !== "INACTIVE" || !!addonReference(source));
  if (cleanup) {
    if (addon!.paddleSubscriptionId && addon!.mpSubscriptionId) blockers.push("MULTIPLE_ADDON_PROVIDERS");
    if (!addonReference(source) || !["paddle", "mercadopago"].includes(addon!.provider)) blockers.push("ADDON_REFERENCE_UNVERIFIED");
    if (!addon!.validUntil) blockers.push("ADDON_PAID_PERIOD_UNKNOWN");
    if (addon!.validUntil && request.effectiveAt < addon!.validUntil) blockers.push("ADDON_PAID_PERIOD_MUST_CONTINUE");
    if (addon!.cancelAt && addon!.cancelAt > request.effectiveAt) blockers.push("ADDON_CANCELLATION_AFTER_TARGET_PERIOD");
    if (addon!.status === "PAST_DUE") blockers.push("ADDON_PAYMENT_REQUIRES_RECONCILIATION");
  }
  let providerPreview: ProviderPreview | null = null;
  let providerFingerprint: string | null = null;
  try {
    const adapter = dependencies.adapter ?? migrationAdapter(current.provider);
    if (adapter.provider !== current.provider) throw new Error("PROVIDER_MISMATCH");
    if (!current.externalSubscriptionId) throw new Error("PROVIDER_REFERENCE_MISSING");
    const canonical = await adapter.getSubscription(current.externalSubscriptionId);
    if (!["active", "authorized"].includes(String((canonical as { status?: string }).status))) blockers.push("PROVIDER_CONTRACT_NOT_ACTIVE");
    providerFingerprint = commercialHash(canonical);
    providerPreview = await adapter.preview(migrationContext(id, source.business.id, request, current.externalSubscriptionId));
    if (!providerPreview.supported) blockers.push(...providerPreview.blockers);
    if (providerPreview.currencyCode !== quote.currencyCode || providerPreview.recurringAmountMinor !== quote.monthlyTotal) blockers.push("PROVIDER_RECURRING_AMOUNT_MISMATCH");
    if (providerPreview.expectedPaymentMinor === null) blockers.push("PROVIDER_PAYMENT_AMOUNT_UNKNOWN");
  } catch { blockers.push("PROVIDER_INFORMATION_UNAVAILABLE"); }
  const benefits = legacy ? { customMonthlyPriceClp: legacy.customMonthlyPriceClp, pendingDiscountPercentage: legacy.pendingDiscountPercentage,
    freeMonthsRemaining: legacy.freeMonthsRemaining, promoFreeMonthsRemaining: legacy.promoFreeMonthsRemaining,
    promoDiscountPercentage: legacy.promoDiscountPercentage, promoDiscountMonthsRemaining: legacy.promoDiscountMonthsRemaining,
    nextBillingOverrideAmount: legacy.nextBillingOverrideAmount, activePrizeId: legacy.activePrizeId, promoName: legacy.promoName,
    hasCountedAsPaidReferral: legacy.hasCountedAsPaidReferral, paymentMethod: legacy.paymentMethod,
    staffLimitOverride: legacy.staffLimitOverride, billingNotesHash: legacy.billingNotesHash } : current.termsSnapshot;
  const currentCapabilities = [...metadata.capabilities];
  if (addon?.status === "ACTIVE" && addon.validUntil && addon.validUntil > now) currentCapabilities.push("website.editor", "website.hosting");
  return {
    version: 1, sourceFingerprint: source.fingerprint,
    current: { plan: current.planCode, status: current.status, catalogVersion: current.catalogVersion,
      contractedProfessionals: metadata.legacy && legacy ? getStaffLimit(legacy) : current.professionalTotal,
      activeProfessionals: source.activeProfessionals,
      price: metadata.legacy ? null : current.totalPriceClp,
      nominalReferencePrice: current.currencyCode !== "CLP" ? null : metadata.legacy && legacy ? quoteLegacyPlan({ plan: legacy.plan, billingCycle: legacy.billingCycle, extraStaffCount: legacy.extraStaffCount }).total : current.totalPriceClp,
      currency: current.currencyCode, priceVerified: !metadata.legacy && current.lastPaymentStatus === "CONFIRMED",
      benefits, offer: source.offer, affiliate: source.affiliate },
    target: quote,
    features: { retained: currentCapabilities.filter(feature => quote.capabilities.includes(feature)),
      added: quote.capabilities.filter(feature => !currentCapabilities.includes(feature)), lost: currentCapabilities.filter(feature => !quote.capabilities.includes(feature)) },
    website: { exists: !!source.website, subdomain: source.website?.subdomain ?? null, domainCount: source.website?.domains.length ?? 0,
      contentPreserved: true, domainPurchaseIncluded: false, cleanupRequired: cleanup,
      addon: addon ? { id: addon.id, status: addon.status, provider: addon.provider, validUntil: addon.validUntil?.toISOString() ?? null,
        cancelAt: addon.cancelAt?.toISOString() ?? null, amount: null, nominalReferenceCurrency: "CLP",
        nominalReferencePrice: source.business.currencyCode === "CLP" ? Number(WEBSITE_CATALOG[websitePriceTier(source.offer)].amount) : null,
        priceTier: websitePriceTier(source.offer), externalId: addonReference(source) } : null },
    provider: { code: current.provider, reference: current.externalSubscriptionId, fingerprint: providerFingerprint, preview: providerPreview },
    effectiveAt: request.effectiveAt.toISOString(), nextBillingAt: current.renewalAt?.toISOString() ?? null,
    strategy: "NEXT_RENEWAL" as const, reconciliation: "NOT_STARTED", monetaryAmountsAreFinalCharges: false,
    reviewedFixtureOnly: reviewed, blockers: [...new Set(blockers)], readyToConfirm: blockers.length === 0,
  };
}
export type MigrationPreview = Awaited<ReturnType<typeof buildMigrationPreview>>;
