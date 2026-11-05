import type { CommercialSubscription } from "@prisma/client";

export const MP_V2_RENEWAL_GRACE_HOURS = 48;
export type RenewalGraceSnapshot = Partial<Pick<CommercialSubscription,
  "provider" | "externalSubscriptionId" | "legacySubscriptionId" | "termsSnapshot" | "renewalCancellationStatus"
  | "status" | "periodStart" | "periodEnd" | "gracePeriodEndsAt" | "lastPaymentStatus" | "lastPaymentEventId" | "lastPaymentAt">>;

/** Local payment evidence authorizes one fixed window, including before the
 * worker first persists dunning. A read never starts or extends that window. */
export function mpV2RenewalGraceDeadline(sub: RenewalGraceSnapshot, now = new Date()): Date | null {
  if (sub.provider !== "MERCADO_PAGO" || !sub.externalSubscriptionId || sub.legacySubscriptionId !== null
    || (sub.termsSnapshot as { origin?: unknown } | null)?.origin !== "registration_v2"
    || sub.renewalCancellationStatus || sub.lastPaymentStatus !== "CONFIRMED" || !sub.lastPaymentEventId
    || !sub.lastPaymentAt || sub.lastPaymentAt > now || !sub.periodStart || sub.periodStart > now
    || !sub.periodEnd || sub.periodEnd <= sub.periodStart
    || !["ACTIVE", "SCHEDULED_CHANGE", "PAST_DUE_GRACE", "PAST_DUE_BLOCKED"].includes(sub.status ?? "")) return null;
  const maximum = new Date(+sub.periodEnd + MP_V2_RENEWAL_GRACE_HOURS * 3600000);
  return sub.gracePeriodEndsAt && sub.gracePeriodEndsAt < maximum ? sub.gracePeriodEndsAt : maximum;
}
