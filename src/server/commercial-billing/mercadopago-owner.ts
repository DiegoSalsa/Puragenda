import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { assertCommercialSandbox, commercialHash } from "@/server/services/commercial-internal";
import { withCommercialCapacityLock } from "@/server/services/commercial-capacity.service";
import { contractHash, executeSandboxBillingOperation, prepareSandboxBillingOperation, previewSandboxBillingOperation, reconcileReadyMercadoPagoPeriods, resolveUnknownSandboxOperation } from "./operations";
import { createMercadoPagoSandboxAdapter, type MercadoPagoSandboxAdapter } from "./mercadopago-sandbox";
import { confirmMercadoPagoCancellation } from "./mercadopago-lifecycle";

export async function requireCommercialBillingOwner(actorId: string) {
  assertCommercialSandbox();
  const user = await prisma.user.findFirst({ where: { id: actorId, deletedAt: null }, select: { id: true } });
  if (!user) throw new Error("OWNER_REQUIRED");
  const business = await getBusinessForUser(actorId);
  if (!business || business.deletedAt || business.ownerId !== actorId) throw new Error("OWNER_REQUIRED");
  return { businessId: business.id, actorId };
}
type Owner = Awaited<ReturnType<typeof requireCommercialBillingOwner>>;
async function current(owner: Owner) {
  // Recheck durable ownership on every service call, including after a slow API.
  const business = await prisma.business.findFirst({ where: { id: owner.businessId, ownerId: owner.actorId, deletedAt: null,
    owner: { deletedAt: null } }, select: { countryCode: true } });
  if (!business) throw new Error("OWNER_REQUIRED");
  const snapshot = await prisma.commercialSubscription.findUniqueOrThrow({ where: { businessId: owner.businessId } });
  if (business.countryCode !== "CL" || snapshot.legacySubscriptionId || snapshot.provider !== "MERCADO_PAGO" ||
    (snapshot.termsSnapshot as { sandboxFixture?: boolean } | null)?.sandboxFixture !== true || snapshot.currencyCode !== "CLP") throw new Error("SANDBOX_FIXTURE_REQUIRED_LEGACY_UNTOUCHED");
  const legacy = await prisma.subscription.findUnique({ where: { businessId: owner.businessId }, select: { mpSubscriptionId: true, paddleSubscriptionId: true } });
  if (legacy?.mpSubscriptionId || legacy?.paddleSubscriptionId) throw new Error("EXISTING_BILLING_CONTRACT_UNTOUCHED");
  return snapshot;
}
export function ownerMercadoPagoEnabled() {
  try { assertCommercialSandbox(); return process.env.COMMERCIAL_V2_MP_OWNER_SANDBOX === "1"; } catch { return false; }
}
function requireEnabled() { if (!ownerMercadoPagoEnabled()) throw new Error("CHECKOUT_DISABLED"); }

export async function loadOwnerMercadoPago(owner: Owner) {
  await current(owner);
  await reconcileReadyMercadoPagoPeriods({ businessId: owner.businessId, limit: 1 });
  const snapshot = await current(owner);
  const operation = await prisma.commercialBillingOperation.findFirst({ where: { businessId: owner.businessId, provider: "MERCADO_PAGO" }, orderBy: { createdAt: "desc" } });
  let configured = false;
  try { createMercadoPagoSandboxAdapter(); configured = Boolean(process.env.COMMERCIAL_V2_MP_TEST_PAYER_EMAIL); } catch { /* availability only */ }
  return { plan: snapshot.planCode, status: snapshot.status, paymentStatus: snapshot.lastPaymentStatus, totalPriceClp: snapshot.totalPriceClp, billingCycle: snapshot.billingCycle, professionalTotal: snapshot.professionalTotal,
    periodEnd: snapshot.periodEnd?.toISOString() ?? null, cancellationStatus: snapshot.renewalCancellationStatus,
    renewalCancelled: Boolean(snapshot.renewalCancelledAt), revision: commercialHash({ contract: contractHash(snapshot), cancellation: snapshot.renewalCancellationStatus }),
    operationStatus: operation?.status ?? null, configured: configured && ownerMercadoPagoEnabled(),
    canCheckout: !snapshot.externalSubscriptionId && ["DRAFT", "PENDING_PAYMENT"].includes(snapshot.status) && snapshot.professionalTotal === 1,
    canCancel: Boolean(snapshot.externalSubscriptionId) && !snapshot.renewalCancelledAt,
  };
}
export async function checkoutOwnerMercadoPago(owner: Owner, adapter: MercadoPagoSandboxAdapter = createMercadoPagoSandboxAdapter()) {
  requireEnabled();
  const snapshot = await current(owner);
  if (snapshot.externalSubscriptionId || !["DRAFT", "PENDING_PAYMENT"].includes(snapshot.status) || snapshot.professionalTotal !== 1) throw new Error("NEW_SANDBOX_CONTRACT_REQUIRED");
  const payer = process.env.COMMERCIAL_V2_MP_TEST_PAYER_EMAIL;
  if (!payer || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payer)) throw new Error("TEST_PAYER_REQUIRED");
  const idempotencyKey = `mp-owner:${snapshot.id}:puragenda-plus-monthly-v1`;
  let operation = await prisma.commercialBillingOperation.findUnique({ where: { idempotencyKey } });
  if (!operation) {
    const now = new Date();
    try { operation = await prepareSandboxBillingOperation({ businessId: owner.businessId, provider: "MERCADO_PAGO", plan: "PURAGENDA_PLUS",
      professionalTotal: 1, strategy: "IMMEDIATE", effectiveAt: now, idempotencyKey }, now); }
    catch (error) {
      operation = await prisma.commercialBillingOperation.findUnique({ where: { idempotencyKey } });
      if (!operation) throw error;
    }
  }
  if (operation.businessId !== owner.businessId) throw new Error("OWNER_REQUIRED");
  const operationId = operation.id;
  const grossAmountClp = operation.recurringAmountMinor;
  await withCommercialCapacityLock(owner.businessId, async tx => {
    await tx.commercialEvent.upsert({ where: { source_eventId: { source: "mp_owner", eventId: `checkout:${operationId}` } },
      create: { businessId: owner.businessId, subscriptionId: snapshot.id, source: "mp_owner", eventId: `checkout:${operationId}`,
        operation: "OWNER_CHECKOUT_CONFIRMED", outcome: "APPLIED", occurredAt: new Date(), payloadHash: commercialHash({ actor: owner.actorId, operation: operationId }),
        details: { actorId: owner.actorId, grossAmountClp, vatIncluded: true, sandbox: true } }, update: {} });
  });
  if (["PREPARED", "SCHEDULED"].includes(operation.status)) {
    try { await previewSandboxBillingOperation(operation.id, adapter); }
    catch (error) {
      const latest = await prisma.commercialBillingOperation.findUniqueOrThrow({ where: { id: operation.id } });
      if (["PREPARED", "SCHEDULED"].includes(latest.status)) throw error;
    }
  }
  await current(owner);
  operation = await executeSandboxBillingOperation(operation.id, adapter, payer);
  if (["UNKNOWN", "EXECUTING"].includes(operation.status)) operation = await resolveUnknownSandboxOperation(operation.id, adapter);
  const url = operation.status === "AWAITING_PAYMENT" && operation.providerSubscriptionId ? await adapter.checkoutUrl(operation.providerSubscriptionId) : null;
  return { status: operation.status, checkoutUrl: url };
}

export async function cancelOwnerMercadoPago(owner: Owner, revision: string, reconcileOnly = false, adapter: MercadoPagoSandboxAdapter = createMercadoPagoSandboxAdapter()) {
  requireEnabled();
  await current(owner);
  const claimed = await withCommercialCapacityLock(owner.businessId, async tx => {
    const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { businessId: owner.businessId } });
    const business = await tx.business.findFirst({ where: { id: owner.businessId, ownerId: owner.actorId, deletedAt: null, owner: { deletedAt: null } }, select: { id: true } });
    if (!business) throw new Error("OWNER_REQUIRED");
    if (!snapshot.externalSubscriptionId) throw new Error("NO_RENEWAL_TO_CANCEL");
    if (snapshot.renewalCancelledAt) return { snapshot, execute: false };
    if (commercialHash({ contract: contractHash(snapshot), cancellation: snapshot.renewalCancellationStatus }) !== revision) throw new Error("BILLING_CONTRACT_CHANGED");
    if (reconcileOnly || snapshot.renewalCancellationStatus) return { snapshot, execute: false };
    if (await tx.commercialBillingOperation.findFirst({ where: { businessId: owner.businessId, status: { in: ["EXECUTING", "UNKNOWN", "PAID", "PREPARED", "SCHEDULED"] } } })) throw new Error("BILLING_OPERATION_OPEN");
    const requestedAt = new Date();
    const updated = await tx.commercialSubscription.update({ where: { id: snapshot.id }, data: { renewalCancellationStatus: "REQUESTED", renewalCancellationRequestedAt: requestedAt } });
    await tx.commercialEvent.create({ data: { businessId: owner.businessId, subscriptionId: snapshot.id, source: "mp_owner",
      eventId: `cancel-request:${snapshot.id}`, operation: "OWNER_RENEWAL_CANCELLATION_REQUESTED", outcome: "APPLIED", occurredAt: requestedAt,
      payloadHash: commercialHash({ actor: owner.actorId, revision }), details: { actorId: owner.actorId, sandbox: true } } });
    return { snapshot: updated, execute: true };
  });
  if (claimed.snapshot.renewalCancelledAt) return { status: "CONFIRMED" };
  try {
    const binding = await prisma.commercialBillingOperation.findFirst({ where: { businessId: owner.businessId, provider: "MERCADO_PAGO",
      providerSubscriptionId: claimed.snapshot.externalSubscriptionId, status: "APPLIED" }, orderBy: { appliedAt: "desc" } });
    if (!binding) throw new Error("MP_CONTRACT_MISMATCH");
    const sub = claimed.execute ? await adapter.cancelRenewal(claimed.snapshot.externalSubscriptionId!, binding.id) : await adapter.getSubscription(claimed.snapshot.externalSubscriptionId!);
    if (!["cancelled", "canceled"].includes(sub.status)) return { status: "UNKNOWN" };
    return await withCommercialCapacityLock(owner.businessId, async tx => {
      const snapshot = await tx.commercialSubscription.findUniqueOrThrow({ where: { businessId: owner.businessId } });
      if (sub.id !== snapshot.externalSubscriptionId) throw new Error("BILLING_CONTRACT_CHANGED");
      const operation = await tx.commercialBillingOperation.findFirst({ where: { businessId: owner.businessId, provider: "MERCADO_PAGO", providerSubscriptionId: sub.id, status: "APPLIED" }, orderBy: { appliedAt: "desc" } });
      if (!operation || sub.external_reference !== operation.id) throw new Error("MP_CONTRACT_MISMATCH");
      const observedAt = new Date();
      const event = await tx.commercialEvent.upsert({ where: { source_eventId: { source: "mp_owner", eventId: `cancel-confirm:${snapshot.id}` } },
        create: { businessId: owner.businessId, subscriptionId: snapshot.id, source: "mp_owner", eventId: `cancel-confirm:${snapshot.id}`,
          operation: "RENEWAL_CANCELLATION_CONFIRMED", occurredAt: observedAt, outcome: "APPLIED", payloadHash: commercialHash({ id: sub.id, status: sub.status }),
          details: { origin: adapter.origin, sandbox: true } }, update: {} });
      await confirmMercadoPagoCancellation(tx, snapshot, observedAt, event.id, observedAt);
      return { status: "CONFIRMED" };
    });
  } catch {
    await prisma.commercialSubscription.updateMany({ where: { id: claimed.snapshot.id, renewalCancellationStatus: "REQUESTED" }, data: { renewalCancellationStatus: "UNKNOWN" } });
    return { status: "UNKNOWN" };
  }
}
