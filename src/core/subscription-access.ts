export type OperationalSubscription = {
  status?: string | null;
  isTrial?: boolean | null;
  trialEndsAt?: Date | string | null;
  gracePeriodEndsAt?: Date | string | null;
};

export type SubscriptionAccessState =
  | "ACTIVE"
  | "TRIAL_ACTIVE"
  | "TRIAL_EXPIRED"
  | "PAST_DUE_GRACE"
  | "PAST_DUE_EXPIRED"
  | "INACTIVE"
  | "CANCELLED"
  | "UNAVAILABLE";

function validDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isTrialCurrentlyActive(
  subscription: OperationalSubscription | null | undefined,
  now = new Date(),
): boolean {
  if (subscription?.status !== "TRIALING" || subscription.isTrial !== true) {
    return false;
  }

  const trialEndsAt = validDate(subscription.trialEndsAt);
  return trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();
}

export function hasDunningAccess(
  subscription: Pick<OperationalSubscription, "status" | "gracePeriodEndsAt">,
  now = new Date(),
): boolean {
  if (subscription.status !== "PAST_DUE") return true;
  const gracePeriodEndsAt = validDate(subscription.gracePeriodEndsAt);
  return gracePeriodEndsAt !== null && gracePeriodEndsAt.getTime() > now.getTime();
}

export function getSubscriptionAccessState(
  subscription: OperationalSubscription | null | undefined,
  now = new Date(),
): SubscriptionAccessState {
  if (!subscription) return "UNAVAILABLE";

  switch (subscription.status) {
    case "ACTIVE":
      return "ACTIVE";
    case "TRIALING":
      return isTrialCurrentlyActive(subscription, now) ? "TRIAL_ACTIVE" : "TRIAL_EXPIRED";
    case "PAST_DUE":
      return hasDunningAccess(subscription, now) ? "PAST_DUE_GRACE" : "PAST_DUE_EXPIRED";
    case "INACTIVE":
      return "INACTIVE";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "UNAVAILABLE";
  }
}

export function hasOperationalSubscriptionAccess(
  subscription: OperationalSubscription | null | undefined,
  now = new Date(),
): boolean {
  const state = getSubscriptionAccessState(subscription, now);
  return state === "ACTIVE" || state === "TRIAL_ACTIVE" || state === "PAST_DUE_GRACE";
}
