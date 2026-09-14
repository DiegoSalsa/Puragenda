import {
  hasOperationalSubscriptionAccess,
  type OperationalSubscription,
} from "@/core/subscription-access";

export function shouldShowWidgetSubscriptionUnavailable(
  subscription: OperationalSubscription | null | undefined,
  previewMode: boolean,
  now = new Date(),
): boolean {
  return !previewMode && !hasOperationalSubscriptionAccess(subscription, now);
}
