import {
  COMMERCIAL_PLAN_METADATA,
  type CommercialCapability,
  type CommercialPlanIdentifier,
} from "@/core/commercial-catalog";

export const COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY = "professional.seats" as const;
export type CommercialEntitlementCapability =
  | CommercialCapability
  | typeof COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY;

export type CommercialEntitlementStatusLike =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE_GRACE"
  | "PAST_DUE_BLOCKED"
  | "SCHEDULED_CHANGE"
  | "INACTIVE"
  | "CANCELLED"
  | "UNKNOWN";

export type CommercialEntitlementEvaluationInput = {
  plan: string;
  status: CommercialEntitlementStatusLike;
  professionalTotal: number;
  trialEnd?: Date | null;
  gracePeriodEndsAt?: Date | null;
  periodEnd?: Date | null;
  periodStart?: Date | null;
  legacyWebsiteUntil?: Date | null;
  legacyWebsiteActive?: boolean;
};

export type CommercialEntitlementEvaluation = {
  plan: CommercialPlanIdentifier;
  status: CommercialEntitlementStatusLike;
  commercialAccess: boolean;
  professionalTotal: number;
  capabilities: readonly CommercialEntitlementCapability[];
  quantities: Readonly<Partial<Record<CommercialEntitlementCapability, number>>>;
  reason: string | null;
};

const ACCESSIBLE_STATUSES = new Set<CommercialEntitlementStatusLike>([
  "ACTIVE",
  "TRIALING",
  "PAST_DUE_GRACE",
  "SCHEDULED_CHANGE",
]);

function validDate(value: Date | null | undefined): Date | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return value;
}

function assertProfessionalTotal(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("La capacidad comercial debe ser un entero positivo seguro");
  }
  return value;
}

function emptyEvaluation(
  input: CommercialEntitlementEvaluationInput,
  plan: CommercialPlanIdentifier,
  professionalTotal: number,
  reason: string,
): CommercialEntitlementEvaluation {
  return {
    plan,
    status: input.status,
    commercialAccess: false,
    professionalTotal,
    capabilities: [],
    quantities: {
      [COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY]: 0,
    },
    reason,
  };
}

/**
 * Pure commercial evaluation. It never consults a user role and never grants
 * dashboard/admin permissions. Callers may use it in shadow mode without
 * changing the legacy authorization result.
 */
export function evaluateCommercialEntitlements(
  input: CommercialEntitlementEvaluationInput,
  now = new Date(),
): CommercialEntitlementEvaluation {
  const professionalTotal = assertProfessionalTotal(input.professionalTotal);
  const metadata = Object.hasOwn(COMMERCIAL_PLAN_METADATA, input.plan) ? COMMERCIAL_PLAN_METADATA[input.plan as CommercialPlanIdentifier] : null;
  if (!metadata) return emptyEvaluation(input, "TEST", professionalTotal, "UNKNOWN_PLAN");

  if (input.periodStart && input.periodStart > now) return emptyEvaluation(input, metadata.plan, professionalTotal, "PERIOD_NOT_STARTED");
  const periodEnd = validDate(input.periodEnd);
  if (input.status !== "PAST_DUE_GRACE" && periodEnd && periodEnd.getTime() <= now.getTime()) {
    return emptyEvaluation(input, metadata.plan, professionalTotal, "PERIOD_EXPIRED");
  }

  if (input.status === "TRIALING") {
    const trialEnd = validDate(input.trialEnd);
    if (!trialEnd || trialEnd.getTime() <= now.getTime()) {
      return emptyEvaluation(input, metadata.plan, professionalTotal, "TRIAL_EXPIRED");
    }
  }

  if (input.status === "PAST_DUE_GRACE") {
    const graceEnd = validDate(input.gracePeriodEndsAt);
    if (!graceEnd || graceEnd.getTime() <= now.getTime()) {
      return emptyEvaluation(input, metadata.plan, professionalTotal, "GRACE_EXPIRED");
    }
  }

  if (!ACCESSIBLE_STATUSES.has(input.status)) {
    return emptyEvaluation(input, metadata.plan, professionalTotal, "COMMERCIAL_ACCESS_BLOCKED");
  }

  const capabilities: CommercialEntitlementCapability[] = [...metadata.capabilities, COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY];
  if (metadata.legacy && input.legacyWebsiteActive && (!input.legacyWebsiteUntil || input.legacyWebsiteUntil > now)) {
    capabilities.push("website.editor", "website.hosting");
  }
  const quantities = Object.fromEntries(
    capabilities.map((capability) => [
      capability,
      capability === COMMERCIAL_PROFESSIONAL_SEATS_CAPABILITY ? professionalTotal : 1,
    ]),
  ) as Record<CommercialEntitlementCapability, number>;

  return {
    plan: metadata.plan,
    status: input.status,
    commercialAccess: true,
    professionalTotal,
    capabilities,
    quantities,
    reason: null,
  };
}

export function hasCommercialCapability(
  evaluation: CommercialEntitlementEvaluation,
  capability: CommercialEntitlementCapability,
): boolean {
  return evaluation.commercialAccess && evaluation.capabilities.includes(capability);
}
