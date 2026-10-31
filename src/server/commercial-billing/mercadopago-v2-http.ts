import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { requireSameOrigin } from "@/server/security/same-origin";
import { commercialSelectionSchema } from "@/server/services/commercial-trial.service";
import { createMpV2Provider } from "./mercadopago-v2-provider";
import { prepareMpV2Operation, executeMpV2Operation, reconcileMpV2Operation, cancelMpV2Renewal } from "./mercadopago-v2";
import { V2_OPEN_STATUSES } from "@/core/commercial-billing-policy";
import { hasPendingCommercialBenefit } from "@/server/services/commercial-benefit-hold";
import { quoteCommercialBenefit } from "@/core/commercial-benefits";

const common = { idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/), accepted: z.literal(true), expectedContractHash: z.string().regex(/^[a-f0-9]{64}$/), mercadoPagoEmail: z.email().optional() };
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SUBSCRIBE"), ...common }).strict(),
  z.object({ action: z.literal("CHANGE"), ...common, selection: commercialSelectionSchema }).strict(),
  z.object({ action: z.literal("RECONCILE"), operationId: z.string().min(1).max(150) }).strict(),
  z.object({ action: z.literal("CANCEL"), accepted: z.literal(true) }).strict(),
]);
export async function mpV2Owner(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return { response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) return { response: NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 }) };
  const sub = await prisma.commercialSubscription.findUnique({ where: { businessId: business.id } });
  if (!sub || !["PURAGENDA", "PURAGENDA_PLUS"].includes(sub.planCode) || sub.legacySubscriptionId || (sub.termsSnapshot as { origin?: string })?.origin !== "registration_v2") return { response: NextResponse.json({ error: "V2_REGISTRATION_CONTRACT_REQUIRED" }, { status: 409 }) };
  return { user, business, sub };
}
export function mpV2HttpError(error: unknown) {
  const code = error instanceof Error ? error.message : "V2_BILLING_FAILED";
  const known = /^(V2_|OWNER_REQUIRED$|IDEMPOTENCY_|ACTIVE_PROFESSIONALS_|VALID_PAID_|BILLING_CYCLE_|SELECTION_|POSITIVE_EXPANSION_)/.test(code) && /^[A-Z0-9_]+$/.test(code);
  return NextResponse.json({ error: known ? code : "V2_BILLING_FAILED" }, { status: code === "OWNER_REQUIRED" ? 403 : /DISABLED|CONFIGURATION|UNVERIFIED/.test(code) ? 503 : known ? 409 : 502 });
}
export async function handleMpV2Command(request: NextRequest, suppliedBody?: unknown) {
  const origin = requireSameOrigin(request); if (origin) return origin;
  const owner = await mpV2Owner(request); if (owner.response) return owner.response;
  const parsed = command.safeParse(suppliedBody ?? await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "V2_INVALID_COMMAND" }, { status: 400 });
  try {
    const input = parsed.data, provider = createMpV2Provider();
    if (input.action === "RECONCILE") return NextResponse.json(await reconcileMpV2Operation(owner.business.id, input.operationId, provider));
    if (input.action === "CANCEL") return NextResponse.json(await cancelMpV2Renewal(owner.business.id, owner.user.id, provider));
    const op = await prepareMpV2Operation({ businessId: owner.business.id, actorId: owner.user.id, idempotencyKey: input.idempotencyKey,
      action: input.action, expectedContractHash: input.expectedContractHash, selection: input.action === "CHANGE" ? input.selection : undefined }, provider);
    return NextResponse.json(await executeMpV2Operation(owner.business.id, op.id, input.mercadoPagoEmail ?? owner.user.email, provider));
  } catch (error) { return mpV2HttpError(error); }
}
export async function mpV2DashboardState(request: NextRequest) {
  const owner = await mpV2Owner(request); if (owner.response) return owner.response;
  let enabled = false, environment: string | undefined;
  try { environment = createMpV2Provider().config.environment; enabled = true; } catch { /* Disabled/configuration incomplete: no provider calls or technical form. */ }
  const operations = await prisma.commercialBillingOperation.findMany({ where: { businessId: owner.business.id, environment: { in: environment ? [environment] : ["V2_SANDBOX", "V2_PRODUCTION"] } }, orderBy: { createdAt: "desc" }, take: 20, include: { payments: { orderBy: { occurredAt: "desc" }, take: 3 } } });
  const open = operations.find(op => V2_OPEN_STATUSES.includes(op.status));
  const root = operations.find(op => op.kind === "NEW_SUBSCRIPTION" && op.providerSubscriptionId === owner.sub.externalSubscriptionId);
  const projection=await prisma.subscription.findUnique({where:{businessId:owner.business.id}});
  const review=await prisma.commercialBillingOperation.findFirst({where:{businessId:owner.business.id,failureCode:{endsWith:"_REVIEW_REQUIRED"}}});
  const benefit=projection?.pendingDiscountPercentage ? {percentage:projection.pendingDiscountPercentage} : projection?.freeMonthsRemaining ? {freeMonths:projection.freeMonthsRemaining} : null;
  const benefitQuote=benefit ? quoteCommercialBenefit(commercialSelectionSchema.parse({plan:owner.sub.planCode,professionalTotal:owner.sub.professionalTotal,billingCycle:owner.sub.billingCycle}),benefit) : null;
  return NextResponse.json({ enabled, contractHash: owner.sub.snapshotHash, plan: owner.sub.planCode, professionalTotal: owner.sub.professionalTotal, billingCycle: owner.sub.billingCycle, total: owner.sub.totalPriceClp,
    status: owner.sub.status, trialEnd: owner.sub.trialEnd, periodEnd: owner.sub.periodEnd, periodStart: owner.sub.periodStart, renewalAt: owner.sub.renewalAt,
    cancellationStatus: owner.sub.renewalCancellationStatus, hasProvider: !!owner.sub.externalSubscriptionId,
    benefitHold:hasPendingCommercialBenefit(projection), reviewRequired:!!review, gracePeriodEndsAt:owner.sub.gracePeriodEndsAt,
    billingCycleChangeEnabled:false, benefitQuote,
    operation: open ? { id: open.id, status: open.status, kind: open.kind, effectiveAt: open.effectiveAt } : null,
    reconcileOperationId: open?.id ?? root?.id ?? null,
    paymentStatus: operations.flatMap(op => op.payments).sort((a, b) => +b.occurredAt - +a.occurredAt)[0]?.status ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
