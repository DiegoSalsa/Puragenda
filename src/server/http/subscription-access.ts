import {
  hasOperationalSubscriptionAccess,
  type OperationalSubscription,
} from "@/core/subscription-access";

export const PUBLIC_SUBSCRIPTION_INACTIVE_ERROR = {
  error: "Las reservas online de este negocio no están disponibles temporalmente.",
  code: "SUBSCRIPTION_INACTIVE",
} as const;

export function operationalSubscriptionDeniedResponse(
  subscription: OperationalSubscription | null | undefined,
  now = new Date(),
): Response | null {
  if (hasOperationalSubscriptionAccess(subscription, now)) return null;
  return Response.json(PUBLIC_SUBSCRIPTION_INACTIVE_ERROR, { status: 403 });
}
