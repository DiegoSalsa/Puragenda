import { randomUUID } from "node:crypto";
import type { Prisma, CommercialMigrationProposal } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertCommercialSandbox, commercialHash } from "@/server/services/commercial-internal";
import { withCommercialCapacityLock } from "@/server/services/commercial-capacity.service";
import { commercialJson, materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import type { SandboxBillingAdapter } from "@/server/commercial-billing/contracts";
import { ACTIVE_MIGRATION_STATES, readMigrationSource, buildMigrationPreview, migrationAdapter, migrationContext,
  comparablePreview, type MigrationDependencies, type MigrationPreview } from "./preview";

export function assertMigrationSandbox() {
  assertCommercialSandbox();
  if (process.env.COMMERCIAL_V2_MIGRATION_WRITES !== "1") throw new Error("MIGRATION_WRITES_DISABLED");
}
const requestSchema = z.object({ businessId: z.string().min(1), actorId: z.string().min(1),
  plan: z.enum(["PURAGENDA", "PURAGENDA_PLUS"]), professionalTotal: z.number().int().positive().max(100_000),
  effectiveAt: z.date(), idempotencyKey: z.string().regex(/^[\w:.-]{8,200}$/) }).strict();
type PrepareInput = z.infer<typeof requestSchema>;
async function ownedSource(businessId: string, actorId: string, tx: Prisma.TransactionClient) {
  const source = await readMigrationSource(businessId, tx);
  if (source.business.ownerId !== actorId) throw new Error("OWNER_REQUIRED");
  return source;
}
const previewOf = (proposal: CommercialMigrationProposal) => proposal.preview as unknown as MigrationPreview;
async function audit(tx: Prisma.TransactionClient, proposal: CommercialMigrationProposal, operation: string, now: Date) {
  await tx.commercialEvent.upsert({ where: { source_eventId: { source: "commercial_migration", eventId: `${proposal.id}:${operation}` } },
    create: { businessId: proposal.businessId, subscriptionId: proposal.subscriptionId, source: "commercial_migration",
      eventId: `${proposal.id}:${operation}`, operation, occurredAt: now, outcome: "APPLIED", correlationId: proposal.id,
      payloadHash: proposal.previewHash, details: { shadow: true } }, update: {} });
}
export async function prepareCommercialMigration(input: PrepareInput, dependencies: MigrationDependencies = {}, now = new Date()) {
  assertMigrationSandbox();
  const data = requestSchema.parse(input);
  const inputHash = commercialHash(data);
  const first = await withCommercialCapacityLock(data.businessId, async tx => {
    const source = await ownedSource(data.businessId, data.actorId, tx);
    const existing = await tx.commercialMigrationProposal.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
    if (existing && (existing.businessId !== data.businessId || existing.inputHash !== inputHash)) throw new Error("MIGRATION_IDEMPOTENCY_CONFLICT");
    return { source, existing };
  });
  if (first.existing) return first.existing;
  const id = randomUUID();
  // Read-only provider I/O runs outside the business lock and cannot charge/cancel.
  const preview = await buildMigrationPreview(first.source, data, id, dependencies, now);
  return withCommercialCapacityLock(data.businessId, async tx => {
    const source = await ownedSource(data.businessId, data.actorId, tx);
    const existing = await tx.commercialMigrationProposal.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
    if (existing) { if (existing.inputHash !== inputHash) throw new Error("MIGRATION_IDEMPOTENCY_CONFLICT"); return existing; }
    if (source.fingerprint !== first.source.fingerprint) throw new Error("SOURCE_CHANGED_DURING_PREVIEW");
    const proposal = await tx.commercialMigrationProposal.create({ data: { id, businessId: data.businessId, subscriptionId: source.commercial!.id,
      createdById: data.actorId, idempotencyKey: data.idempotencyKey, inputHash, sourceFingerprint: source.fingerprint,
      previewHash: commercialHash(preview), preview: commercialJson(preview), targetPlanCode: data.plan, professionalTotal: data.professionalTotal,
      provider: source.commercial!.provider, effectiveAt: data.effectiveAt, expiresAt: new Date(now.getTime() + 30 * 60_000),
      status: preview.readyToConfirm ? "AWAITING_APPROVAL" : "BLOCKED", reason: preview.blockers.join(",") || null,
      websiteTransition: { create: { addonId: preview.website.cleanupRequired ? source.addon?.id : null,
        provider: preview.website.addon?.provider, externalSubscriptionId: preview.website.addon?.externalId,
        paidUntil: source.addon?.validUntil, status: preview.website.cleanupRequired ? "REVIEW_REQUIRED" : "NOT_REQUIRED" } } } });
    await audit(tx, proposal, "PROPOSAL_PREPARED", now);
    return proposal;
  });
}

export async function approveCommercialMigration(businessId: string, actorId: string, id: string, expectedPreviewHash: string,
  confirmed: boolean, dependencies: MigrationDependencies = {}, now = new Date()) {
  assertMigrationSandbox();
  if (confirmed !== true) throw new Error("EXPLICIT_ACCEPTANCE_REQUIRED");
  const proposal = await prisma.commercialMigrationProposal.findFirstOrThrow({ where: { id, businessId } });
  const owner = await prisma.business.findFirst({ where: { id: businessId, ownerId: actorId, deletedAt: null }, select: { id: true } });
  if (!owner) throw new Error("OWNER_REQUIRED");
  if (proposal.previewHash !== expectedPreviewHash) throw new Error("PREVIEW_HASH_MISMATCH");
  if (proposal.approvedAt) return proposal;
  const original = previewOf(proposal);
  let providerUnchanged = false;
  if (original.readyToConfirm) {
    try {
      const adapter = dependencies.adapter ?? migrationAdapter(proposal.provider);
      if (adapter.provider !== proposal.provider || !original.provider.reference) throw new Error("PROVIDER_MISMATCH");
      const canonical = await adapter.getSubscription(original.provider.reference);
      const fresh = await adapter.preview(migrationContext(id, businessId, { plan: proposal.targetPlanCode,
        professionalTotal: proposal.professionalTotal, effectiveAt: proposal.effectiveAt }, original.provider.reference));
      providerUnchanged = commercialHash(canonical) === original.provider.fingerprint && !!original.provider.preview
        && commercialHash(comparablePreview(fresh)) === commercialHash(comparablePreview(original.provider.preview));
    } catch { providerUnchanged = false; }
  }
  return withCommercialCapacityLock(businessId, async tx => {
    const source = await ownedSource(businessId, actorId, tx);
    const current = await tx.commercialMigrationProposal.findFirstOrThrow({ where: { id, businessId } });
    if (current.approvedAt) return current;
    if (current.status !== "AWAITING_APPROVAL" || !original.readyToConfirm) throw new Error("PROPOSAL_NOT_CONFIRMABLE");
    if (current.previewHash !== expectedPreviewHash || commercialHash(current.preview) !== expectedPreviewHash) throw new Error("PREVIEW_HASH_MISMATCH");
    if (source.fingerprint !== current.sourceFingerprint || current.expiresAt <= now || !providerUnchanged) {
      const invalid = await tx.commercialMigrationProposal.update({ where: { id }, data: { status: "INVALIDATED", reason: "STALE_PROPOSAL" } });
      await audit(tx, invalid, "PROPOSAL_INVALIDATED", now); return invalid;
    }
    if (await tx.commercialMigrationProposal.findFirst({ where: { businessId, id: { not: id }, status: { in: ACTIVE_MIGRATION_STATES } } })) throw new Error("OTHER_MIGRATION_OPEN");
    if (source.seats.length || source.billing.length) throw new Error("OTHER_COMMERCIAL_CHANGE_OPEN");
    const approved = await tx.commercialMigrationProposal.update({ where: { id }, data: { status: "PENDING_PROVIDER_CHANGE", approvedById: actorId, approvedAt: now, reason: null } });
    await tx.commercialWebsiteTransition.update({ where: { proposalId: id }, data: { status: original.website.cleanupRequired ? "PENDING_CANCELLATION" : "NOT_REQUIRED" } });
    await audit(tx, approved, "PROPOSAL_APPROVED", now);
    return approved;
  });
}

export async function getCommercialMigrationStatus(businessId: string, id: string, now = new Date()) {
  assertMigrationSandbox();
  const p = await prisma.commercialMigrationProposal.findFirstOrThrow({ where: { id, businessId }, include: { websiteTransition: true } });
  const source = await readMigrationSource(businessId);
  const transitionReady = !previewOf(p).website.cleanupRequired || p.websiteTransition?.status === "CANCELLED_VERIFIED";
  return { id: p.id, status: p.status, previewHash: p.previewHash, reason: p.reason, approvedAt: p.approvedAt, effectiveAt: p.effectiveAt,
    stale: p.status !== "APPLIED" && (source.fingerprint !== p.sourceFingerprint || !p.approvedAt && p.expiresAt <= now),
    websiteTransition: p.websiteTransition?.status ?? null,
    canPrepareBaseProviderChange: !!p.approvedAt && transitionReady && p.effectiveAt <= now && ACTIVE_MIGRATION_STATES.includes(p.status)
      && source.fingerprint === p.sourceFingerprint,
    externalMutationsImplemented: false, changesEffectiveAccess: false };
}

/** Cancellation is a canonical GET, never an arbitrary browser state or a call
 * to cancel(). A scheduled cancellation remains unconfirmed until terminal. */
export async function reconcileMigrationWebsiteAddon(id: string, adapter: SandboxBillingAdapter, now = new Date()) {
  assertMigrationSandbox();
  const proposal = await prisma.commercialMigrationProposal.findUniqueOrThrow({ where: { id }, include: { websiteTransition: true } });
  const transition = proposal.websiteTransition;
  if (!proposal.approvedAt || !transition?.externalSubscriptionId || !previewOf(proposal).website.cleanupRequired) throw new Error("APPROVED_ADDON_TRANSITION_REQUIRED");
  const expected = transition.provider === "paddle" ? "PADDLE" : transition.provider === "mercadopago" ? "MERCADO_PAGO" : null;
  if (expected !== adapter.provider) throw new Error("ADDON_PROVIDER_MISMATCH");
  let canonical: { status: string; resourceAt: Date; fingerprint: string; scheduled: boolean };
  try {
    const result = await adapter.getSubscription(transition.externalSubscriptionId) as Record<string, unknown>;
    const timestamp = result.updatedAt ?? result.last_modified;
    const resourceAt = timestamp instanceof Date ? timestamp : new Date(String(timestamp ?? ""));
    const change = result.scheduledChange as { action?: string } | null;
    if (!Number.isFinite(resourceAt.getTime()) || resourceAt > now || result.id !== transition.externalSubscriptionId) throw new Error("INVALID_ADDON_OBSERVATION");
    canonical = { status: String(result.status), resourceAt, fingerprint: commercialHash(result), scheduled: change?.action === "cancel" };
  } catch {
    return withCommercialCapacityLock(proposal.businessId, async tx => {
      const current = await tx.commercialMigrationProposal.findUniqueOrThrow({ where: { id } });
      if (current.status === "APPLIED") return { applied: false, alreadyApplied: true };
      await tx.commercialWebsiteTransition.update({ where: { proposalId: id }, data: { status: "UNKNOWN" } });
      await tx.commercialMigrationProposal.update({ where: { id }, data: { status: "UNKNOWN", reason: "ADDON_RESULT_UNKNOWN" } });
      return { applied: false, unknown: true };
    });
  }
  return withCommercialCapacityLock(proposal.businessId, async tx => {
    const current = await tx.commercialMigrationProposal.findUniqueOrThrow({ where: { id } });
    const previous = await tx.commercialWebsiteTransition.findUniqueOrThrow({ where: { proposalId: id } });
    if (current.status === "APPLIED") return { applied: false, alreadyApplied: true };
    if (previous.lastResourceAt && canonical.resourceAt < previous.lastResourceAt) return { applied: false, ignored: true };
    const terminal = ["canceled", "cancelled"].includes(canonical.status);
    const status = terminal ? "CANCELLED_VERIFIED" : canonical.scheduled ? "SCHEDULED" : "PENDING_CANCELLATION";
    await tx.commercialWebsiteTransition.update({ where: { proposalId: id }, data: { status, origin: adapter.origin,
      lastResourceAt: canonical.resourceAt, cancellationObservedAt: terminal ? now : null } });
    await tx.commercialEvent.upsert({ where: { source_eventId: { source: "migration_addon", eventId: `${id}:${canonical.fingerprint}` } },
      create: { businessId: proposal.businessId, subscriptionId: proposal.subscriptionId, source: "migration_addon", eventId: `${id}:${canonical.fingerprint}`,
        operation: status, occurredAt: canonical.resourceAt, outcome: "APPLIED", correlationId: id,
        payloadHash: canonical.fingerprint, details: { origin: adapter.origin, shadow: true } }, update: {} });
    await tx.commercialMigrationProposal.update({ where: { id }, data: { status: "PENDING_RECONCILIATION", reason: terminal ? null : "ADDON_STILL_BILLING" } });
    return applyMigration(tx, current, now);
  });
}

async function applyMigration(tx: Prisma.TransactionClient, proposal: CommercialMigrationProposal, now: Date) {
  if (proposal.status === "APPLIED") return { applied: false, alreadyApplied: true };
  if (!proposal.approvedAt || !ACTIVE_MIGRATION_STATES.includes(proposal.status)) throw new Error("APPROVED_PROPOSAL_REQUIRED");
  const source = await readMigrationSource(proposal.businessId, tx);
  if (source.fingerprint !== proposal.sourceFingerprint) {
    await tx.commercialMigrationProposal.update({ where: { id: proposal.id }, data: { status: "INVALIDATED", reason: "SOURCE_CHANGED_AFTER_APPROVAL" } });
    return { applied: false, stale: true };
  }
  const preview = previewOf(proposal);
  if (commercialHash(proposal.preview) !== proposal.previewHash) throw new Error("IMMUTABLE_PREVIEW_MISMATCH");
  const payment = await tx.commercialMigrationEvidence.findFirst({ where: { proposalId: proposal.id, state: "CONFIRMED" }, orderBy: { resourceUpdatedAt: "desc" } });
  if (!payment) return { applied: false, awaitingPayment: true };
  const transition = await tx.commercialWebsiteTransition.findUniqueOrThrow({ where: { proposalId: proposal.id } });
  if (preview.website.cleanupRequired && (transition.status !== "CANCELLED_VERIFIED" || !transition.cancellationObservedAt)) {
    await tx.commercialMigrationProposal.update({ where: { id: proposal.id }, data: { status: "PENDING_RECONCILIATION", reason: "ADDON_STILL_BILLING" } });
    return { applied: false, awaitingAddonCancellation: true };
  }
  if (!payment.periodStart || !payment.periodEnd || payment.amountMinor !== preview.provider.preview?.expectedPaymentMinor
    || payment.currencyCode !== preview.target.currencyCode || payment.provider !== proposal.provider
    || payment.providerSubscriptionId !== preview.provider.reference || payment.resourceUpdatedAt < proposal.approvedAt
    || payment.periodStart < proposal.effectiveAt || payment.periodEnd <= now) throw new Error("MIGRATION_PAYMENT_MISMATCH");
  if (preview.website.cleanupRequired && transition.paidUntil && payment.periodStart < transition.paidUntil) throw new Error("ADDON_PAID_CONTINUITY_REQUIRED");
  if (proposal.effectiveAt > now || payment.periodStart > now) {
    await tx.commercialMigrationProposal.update({ where: { id: proposal.id }, data: { status: "SCHEDULED" } });
    return { applied: false, scheduled: true };
  }
  if (source.activeProfessionals > proposal.professionalTotal) throw new Error("ACTIVE_STAFF_CONFLICT");
  const quote = migrationContext(proposal.id, proposal.businessId, { plan: proposal.targetPlanCode,
    professionalTotal: proposal.professionalTotal, effectiveAt: proposal.effectiveAt }, preview.provider.reference).quote;
  if (commercialHash(quote) !== commercialHash(preview.target)) throw new Error("CATALOG_CHANGED");
  const snapshot = source.commercial!;
  await tx.commercialSubscriptionItem.updateMany({ where: { subscriptionId: snapshot.id, effectiveTo: null,
    kind: { in: preview.website.cleanupRequired ? ["BASE_PLAN", "PROFESSIONAL_SEATS", "LEGACY_ADDON"] : ["BASE_PLAN", "PROFESSIONAL_SEATS"] } }, data: { effectiveTo: payment.periodStart } });
  await tx.commercialSubscriptionItem.createMany({ data: [
    { subscriptionId: snapshot.id, kind: "BASE_PLAN", code: quote.plan, quantity: 1, unitAmountClp: quote.baseMonthly, amountClp: quote.baseMonthly,
      currencyCode: quote.currencyCode, catalogVersion: quote.catalogVersion, effectiveFrom: payment.periodStart },
    { subscriptionId: snapshot.id, kind: "PROFESSIONAL_SEATS", code: "professional_seats", quantity: quote.professionalTotal,
      amountClp: quote.professionalSurchargeMonthly, currencyCode: quote.currencyCode, catalogVersion: quote.catalogVersion,
      effectiveFrom: payment.periodStart, pricingSnapshot: commercialJson({ surchargeSteps: quote.surchargeSteps }) },
  ] });
  const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: { planCode: quote.plan,
    catalogVersion: quote.catalogVersion, professionalTotal: quote.professionalTotal, basePriceClp: quote.baseMonthly,
    totalPriceClp: quote.monthlyTotal, billingCycle: "MONTHLY", status: "ACTIVE", periodStart: payment.periodStart,
    periodEnd: payment.periodEnd, renewalAt: payment.periodEnd, lastPaymentStatus: "CONFIRMED", lastPaymentAt: payment.resourceUpdatedAt,
    lastPaymentEventId: payment.id, lastReconciledAt: payment.resourceUpdatedAt, lastReconciledEventId: payment.eventId,
    snapshotHash: commercialHash({ previous: snapshot.snapshotHash, proposal: proposal.previewHash, payment: payment.id }),
    termsSnapshot: commercialJson({ ...(snapshot.termsSnapshot as object ?? {}), migration: { proposalId: proposal.id,
      approvedById: proposal.approvedById, approvedAt: proposal.approvedAt, preservedBenefits: preview.current.benefits,
      preservedOffer: source.offer, preservedLegacyContract: source.legacy, preservedAffiliate: source.affiliate } }) } });
  await materializeCommercialEntitlements(tx, updated, now);
  if (preview.website.cleanupRequired) await tx.commercialWebsiteTransition.update({ where: { proposalId: proposal.id }, data: { status: "INCLUDED" } });
  const applied = await tx.commercialMigrationProposal.update({ where: { id: proposal.id }, data: { status: "APPLIED", appliedAt: now, reason: null } });
  await audit(tx, applied, "MIGRATION_APPLIED", now);
  // No write to Subscription, WebsiteAddon, founder offers, websites, domains or media.
  return { applied: true, alreadyApplied: false };
}
export async function applyApprovedCommercialMigration(businessId: string, id: string, now = new Date()) {
  assertMigrationSandbox();
  return withCommercialCapacityLock(businessId, async tx => applyMigration(tx,
    await tx.commercialMigrationProposal.findFirstOrThrow({ where: { id, businessId } }), now));
}

/** Unmarshal/HMAC first; then canonical subscription/invoice/payment via the
 * iteration-4 adapter. This service cannot execute a provider mutation. */
export async function reconcileMigrationPayment(id: string, raw: string, headers: Headers, adapter: SandboxBillingAdapter, now = new Date()) {
  assertMigrationSandbox();
  if (Buffer.byteLength(raw, "utf8") > 262_144) throw new Error("WEBHOOK_TOO_LARGE");
  const note = await adapter.verifyNotification(raw, headers);
  if (note.occurredAt > now) throw new Error("FUTURE_PROVIDER_EVENT");
  const proposal = await prisma.commercialMigrationProposal.findUniqueOrThrow({ where: { id } });
  const preview = previewOf(proposal);
  if (!proposal.approvedAt || adapter.provider !== proposal.provider) throw new Error("APPROVED_PROVIDER_BINDING_REQUIRED");
  const location = await adapter.locate(note);
  if (!location.subscriptionId || location.operationReference !== id || location.subscriptionId !== preview.provider.reference) throw new Error("MIGRATION_PROVIDER_BINDING_MISMATCH");
  const observation = await adapter.observe(migrationContext(id, proposal.businessId, { plan: proposal.targetPlanCode,
    professionalTotal: proposal.professionalTotal, effectiveAt: proposal.effectiveAt }, preview.provider.reference), note, preview.provider.preview);
  const canonical = await adapter.getSubscription(location.subscriptionId) as { status: string };
  if (!observation.contractMatches || observation.operationReference !== id || observation.providerSubscriptionId !== preview.provider.reference
    || observation.currencyCode !== preview.target.currencyCode || observation.resourceUpdatedAt < proposal.approvedAt
    || observation.resourceUpdatedAt > now || observation.origin !== adapter.origin) throw new Error("MIGRATION_EVIDENCE_MISMATCH");
  if (observation.state === "CONFIRMED" && !["active", "authorized"].includes(canonical.status)) throw new Error("PROVIDER_CONTRACT_NOT_ACTIVE");
  return withCommercialCapacityLock(proposal.businessId, async tx => {
    const current = await tx.commercialMigrationProposal.findUniqueOrThrow({ where: { id } });
    const duplicate = await tx.commercialEvent.findUnique({ where: { source_eventId: { source: `migration_${adapter.provider}`, eventId: note.eventId } } });
    if (duplicate) {
      if (duplicate.correlationId !== id || duplicate.payloadHash !== note.rawHash) throw new Error("MIGRATION_EVENT_ID_CONFLICT");
      return { duplicate: true, applied: false };
    }
    const prior = observation.paymentId ? await tx.commercialMigrationEvidence.findUnique({ where: { provider_paymentId: { provider: adapter.provider, paymentId: observation.paymentId } } }) : null;
    if (prior && prior.proposalId !== id || observation.paymentId && await tx.commercialPaymentEvidence.findUnique({ where: { provider_paymentId: { provider: adapter.provider, paymentId: observation.paymentId } } })) throw new Error("PAYMENT_ALREADY_BOUND");
    const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: proposal.subscriptionId } });
    const reversal = ["REFUNDED", "CHARGEBACK"].includes(observation.state);
    const stale = prior && (observation.resourceUpdatedAt < prior.resourceUpdatedAt || ["REFUNDED", "CHARGEBACK"].includes(prior.state))
      || !reversal && snapshot.lastReconciledAt && observation.resourceUpdatedAt < snapshot.lastReconciledAt;
    const validPayment = observation.state === "CONFIRMED" && observation.paymentId && observation.amountMinor === preview.provider.preview?.expectedPaymentMinor
      && observation.periodStart && observation.periodEnd && observation.periodStart >= proposal.effectiveAt && observation.periodStart < observation.periodEnd;
    if (observation.state === "CONFIRMED" && !validPayment) throw new Error("MIGRATION_PAYMENT_MISMATCH");
    await tx.commercialEvent.create({ data: { businessId: proposal.businessId, subscriptionId: proposal.subscriptionId,
      source: `migration_${adapter.provider}`, eventId: note.eventId, operation: `MIGRATION_${observation.state}`, occurredAt: note.occurredAt,
      outcome: stale ? "IGNORED" : validPayment ? "APPLIED" : "UNKNOWN", correlationId: id, payloadHash: note.rawHash, details: { origin: adapter.origin } } });
    if (stale) return { applied: false, ignored: true };
    if (!observation.paymentId && ["CANCELLED", "REJECTED"].includes(observation.state)) {
      const authoritative = snapshot.lastPaymentEventId && await tx.commercialMigrationEvidence.findFirst({ where: { id: snapshot.lastPaymentEventId, proposalId: id } });
      if (current.status === "APPLIED" && authoritative) {
        const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: {
          status: observation.state === "CANCELLED" ? "CANCELLED" : "PAST_DUE_BLOCKED", lastReconciledAt: observation.resourceUpdatedAt,
          lastReconciledEventId: note.eventId } });
        await materializeCommercialEntitlements(tx, updated, now);
        return { applied: false, lifecycleUpdated: true };
      }
    }
    if (!observation.paymentId) return { applied: false, awaitingPayment: true };
    const evidence = await tx.commercialMigrationEvidence.upsert({ where: { provider_paymentId: { provider: adapter.provider, paymentId: observation.paymentId } },
      create: { proposalId: id, businessId: proposal.businessId, provider: adapter.provider, eventId: note.eventId, payloadHash: note.rawHash,
        origin: adapter.origin, state: observation.state, paymentId: observation.paymentId, amountMinor: observation.amountMinor,
        currencyCode: observation.currencyCode, providerSubscriptionId: observation.providerSubscriptionId,
        periodStart: observation.periodStart, periodEnd: observation.periodEnd, resourceUpdatedAt: observation.resourceUpdatedAt },
      update: { state: observation.state, eventId: note.eventId, resourceUpdatedAt: observation.resourceUpdatedAt, payloadHash: note.rawHash,
        amountMinor: observation.amountMinor, periodStart: observation.periodStart, periodEnd: observation.periodEnd } });
    if (["REFUNDED", "CHARGEBACK", "REJECTED"].includes(observation.state)) {
      const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { id: proposal.subscriptionId } });
      if (snapshot.lastPaymentEventId === evidence.id) {
        const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: { status: "PAST_DUE_BLOCKED", lastPaymentStatus: observation.state } });
        await materializeCommercialEntitlements(tx, updated, now);
      }
      return { applied: false, reversed: true };
    }
    if (!validPayment) return { applied: false, awaitingPayment: true };
    return applyMigration(tx, current, now);
  });
}
