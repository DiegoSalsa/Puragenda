import {
  ANNUAL_MULTIPLIER,
  COMMERCIAL_BASE_PRICING,
  EXTRA_STAFF_COST,
  PRICING,
  STAFF_LIMITS,
} from "@/core/constants";

export const COMMERCIAL_CATALOG_VERSION = "puragenda-next-v1" as const;
export const COMMERCIAL_CURRENCY = "CLP" as const;
export const COMMERCIAL_MAX_PROFESSIONALS = 20 as const;
export const COMMERCIAL_ANNUAL_POLICY = {
  monthsInYear: 12,
  paidMonths: ANNUAL_MULTIPLIER,
} as const;

export type CommercialCatalogVersion = typeof COMMERCIAL_CATALOG_VERSION;
export type CommercialPlanCode = "PURAGENDA" | "PURAGENDA_PLUS";
export type LegacyPlanCode = "INDIVIDUAL" | "EQUIPO" | "TEST";
export type CommercialPlanIdentifier = CommercialPlanCode | LegacyPlanCode;
export type CommercialBillingCycle = "MONTHLY" | "ANNUAL";
export type CommercialCapability =
  | "agenda.operations"
  | "clients.operations"
  | "services.operations"
  | "staff.operations"
  | "loyalty.operations"
  | "gift_cards.operations"
  | "puri.standard"
  | "analytics.operational"
  | "booking.public_link"
  | "puri.plus"
  | "contact_flow"
  | "website.editor"
  | "website.hosting"
  | "analytics.commercial";

export type CommercialPlanMetadata = {
  plan: CommercialPlanIdentifier;
  displayName: string;
  legacy: boolean;
  baseMonthly: number;
  includedProfessionals: number;
  annualPolicy: "UNDEFINED" | "TWO_MONTHS_FREE" | "LEGACY_MULTIPLIER_10";
  capabilities: readonly CommercialCapability[];
};

const PURAGENDA_CAPABILITIES = [
  "agenda.operations",
  "clients.operations",
  "services.operations",
  "staff.operations",
  "loyalty.operations",
  "gift_cards.operations",
  "puri.standard",
  "analytics.operational",
  "booking.public_link",
] as const satisfies readonly CommercialCapability[];

const PURAGENDA_PLUS_CAPABILITIES = [
  ...PURAGENDA_CAPABILITIES,
  "puri.plus",
  "contact_flow",
  "website.editor",
  "website.hosting",
  "analytics.commercial",
] as const satisfies readonly CommercialCapability[];

/**
 * Descriptive metadata only. It does not grant permissions or enable features.
 * Server-side authorization must combine these capabilities with the current
 * user role, business membership and location scope.
 */
export const COMMERCIAL_PLAN_METADATA = {
  PURAGENDA: {
    plan: "PURAGENDA",
    displayName: "Puragenda",
    legacy: false,
    baseMonthly: COMMERCIAL_BASE_PRICING.PURAGENDA.monthly,
    includedProfessionals: 1,
    annualPolicy: "TWO_MONTHS_FREE",
    capabilities: PURAGENDA_CAPABILITIES,
  },
  PURAGENDA_PLUS: {
    plan: "PURAGENDA_PLUS",
    displayName: "Puragenda+",
    legacy: false,
    baseMonthly: COMMERCIAL_BASE_PRICING.PURAGENDA_PLUS.monthly,
    includedProfessionals: 1,
    annualPolicy: "TWO_MONTHS_FREE",
    capabilities: PURAGENDA_PLUS_CAPABILITIES,
  },
  INDIVIDUAL: {
    plan: "INDIVIDUAL",
    displayName: PRICING.INDIVIDUAL.name,
    legacy: true,
    baseMonthly: PRICING.INDIVIDUAL.monthly,
    includedProfessionals: STAFF_LIMITS.INDIVIDUAL,
    annualPolicy: "LEGACY_MULTIPLIER_10",
    capabilities: PURAGENDA_CAPABILITIES,
  },
  EQUIPO: {
    plan: "EQUIPO",
    displayName: PRICING.EQUIPO.name,
    legacy: true,
    baseMonthly: PRICING.EQUIPO.monthly,
    includedProfessionals: STAFF_LIMITS.EQUIPO,
    annualPolicy: "LEGACY_MULTIPLIER_10",
    capabilities: PURAGENDA_CAPABILITIES,
  },
  TEST: {
    plan: "TEST",
    displayName: PRICING.TEST.name,
    legacy: true,
    baseMonthly: PRICING.TEST.monthly,
    includedProfessionals: STAFF_LIMITS.TEST,
    annualPolicy: "LEGACY_MULTIPLIER_10",
    capabilities: PURAGENDA_CAPABILITIES,
  },
} as const satisfies Record<CommercialPlanIdentifier, CommercialPlanMetadata>;

export type CommercialCatalogErrorCode =
  | "INVALID_INPUT"
  | "INVALID_PLAN"
  | "UNKNOWN_VERSION"
  | "INVALID_PROFESSIONAL_TOTAL"
  | "UNSAFE_AMOUNT"
  | "UNSUPPORTED_BILLING_CYCLE"
  | "INVALID_LEGACY_EXTRA_STAFF";

export class CommercialCatalogError extends Error {
  constructor(
    public readonly code: CommercialCatalogErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CommercialCatalogError";
  }
}

export type ProfessionalSurchargeStep = {
  fromProfessional: number;
  toProfessional: number;
  unitAmount: number;
  quantity: number;
  subtotal: number;
};

export type CommercialQuote = {
  catalogVersion: CommercialCatalogVersion;
  plan: CommercialPlanCode;
  displayName: string;
  legacy: false;
  billingCycle: "MONTHLY";
  currencyCode: typeof COMMERCIAL_CURRENCY;
  professionalTotal: number;
  includedProfessionals: 1;
  baseMonthly: number;
  professionalSurchargeMonthly: number;
  monthlyTotal: number;
  cycleTotal: number;
  surchargeSteps: readonly ProfessionalSurchargeStep[];
  capabilities: readonly CommercialCapability[];
};

export type CommercialQuoteInput = {
  catalogVersion: string;
  plan: string;
  professionalTotal: number;
  billingCycle?: string;
};

export type LegacyQuote = {
  catalogVersion: "legacy-current";
  plan: LegacyPlanCode;
  displayName: string;
  legacy: true;
  billingCycle: CommercialBillingCycle;
  currencyCode: typeof COMMERCIAL_CURRENCY;
  extraStaffCount: number;
  baseMonthly: number;
  extraCost: number;
  total: number;
};

function safeAmount(value: number, context: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CommercialCatalogError(
      "UNSAFE_AMOUNT",
      context + " no puede representarse como un entero monetario seguro",
    );
  }
  return value;
}

function positiveSafeInteger(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new CommercialCatalogError(
      "INVALID_PROFESSIONAL_TOTAL",
      "La cantidad de profesionales debe ser un entero positivo seguro",
    );
  }
  return value;
}

function nonNegativeSafeInteger(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new CommercialCatalogError(
      "INVALID_LEGACY_EXTRA_STAFF",
      "La cantidad legacy de extras debe ser un entero seguro no negativo",
    );
  }
  return value;
}

function validateVersion(value: unknown): asserts value is CommercialCatalogVersion {
  if (value !== COMMERCIAL_CATALOG_VERSION) {
    throw new CommercialCatalogError(
      "UNKNOWN_VERSION",
      "Versión comercial desconocida: " + String(value),
    );
  }
}

function validateNewPlan(value: unknown): asserts value is CommercialPlanCode {
  if (value !== "PURAGENDA" && value !== "PURAGENDA_PLUS") {
    throw new CommercialCatalogError(
      "INVALID_PLAN",
      "El plan no pertenece al catálogo V2: " + String(value),
    );
  }
}

function surchargeSteps(professionalTotal: number): ProfessionalSurchargeStep[] {
  const steps: ProfessionalSurchargeStep[] = [];
  const fixedSteps = [
    { professional: 2, amount: 5_000 },
    { professional: 3, amount: 4_500 },
    { professional: 4, amount: 4_000 },
    { professional: 5, amount: 3_500 },
  ] as const;

  for (const step of fixedSteps) {
    if (professionalTotal < step.professional) continue;
    steps.push({
      fromProfessional: step.professional,
      toProfessional: step.professional,
      unitAmount: step.amount,
      quantity: 1,
      subtotal: step.amount,
    });
  }

  if (professionalTotal >= 6) {
    const quantity = professionalTotal - 5;
    const subtotal = safeAmount(quantity * 3_000, "El recargo de profesionales");
    steps.push({
      fromProfessional: 6,
      toProfessional: professionalTotal,
      unitAmount: 3_000,
      quantity,
      subtotal,
    });
  }

  return steps;
}

export function calculateProfessionalSurcharge(professionalTotal: number): number {
  const total = positiveSafeInteger(professionalTotal);
  const surcharge = surchargeSteps(total).reduce(
    (sum, step) => safeAmount(sum + step.subtotal, "El recargo acumulado"),
    0,
  );
  return surcharge;
}

export function getCommercialPlanMetadata(
  plan: string,
): CommercialPlanMetadata {
  const metadata = COMMERCIAL_PLAN_METADATA[plan as CommercialPlanIdentifier];
  if (!metadata) {
    throw new CommercialCatalogError(
      "INVALID_PLAN",
      "Plan comercial desconocido: " + plan,
    );
  }
  return metadata;
}

export function quoteCommercialPlan(input: CommercialQuoteInput): CommercialQuote {
  if (!input || typeof input !== "object") {
    throw new CommercialCatalogError("INVALID_INPUT", "Falta la entrada del quote");
  }

  validateVersion(input.catalogVersion);
  validateNewPlan(input.plan);
  const professionalTotal = positiveSafeInteger(input.professionalTotal);
  const billingCycle = input.billingCycle ?? "MONTHLY";
  if (billingCycle !== "MONTHLY") {
    throw new CommercialCatalogError(
      "UNSUPPORTED_BILLING_CYCLE",
      "Este flujo de contratación solo admite facturación mensual",
    );
  }

  const metadata = COMMERCIAL_PLAN_METADATA[input.plan];
  const surchargeStepsResult = surchargeSteps(professionalTotal);
  const professionalSurchargeMonthly = surchargeStepsResult.reduce(
    (sum, step) => safeAmount(sum + step.subtotal, "El recargo acumulado"),
    0,
  );
  const monthlyTotal = safeAmount(
    metadata.baseMonthly + professionalSurchargeMonthly,
    "El total mensual",
  );

  return {
    catalogVersion: COMMERCIAL_CATALOG_VERSION,
    plan: input.plan,
    displayName: metadata.displayName,
    legacy: false,
    billingCycle: "MONTHLY",
    currencyCode: COMMERCIAL_CURRENCY,
    professionalTotal,
    includedProfessionals: 1,
    baseMonthly: metadata.baseMonthly,
    professionalSurchargeMonthly,
    monthlyTotal,
    cycleTotal: monthlyTotal,
    surchargeSteps: surchargeStepsResult,
    capabilities: metadata.capabilities,
  };
}

/**
 * Read-only annual offer for public pricing. Reuses the full progressive monthly
 * quote, including professionals. It does not enable annual provider operations
 * or change the monthly-only contract of quoteCommercialPlan.
 */
export function quoteCommercialAnnualPlan(input: Omit<CommercialQuoteInput, "billingCycle">) {
  const monthly = quoteCommercialPlan({ ...input, billingCycle: "MONTHLY" });
  const metadata = COMMERCIAL_PLAN_METADATA[monthly.plan];
  if (metadata.annualPolicy !== "TWO_MONTHS_FREE") {
    throw new CommercialCatalogError("UNSUPPORTED_BILLING_CYCLE", "El plan no tiene una oferta anual definida");
  }
  const { monthsInYear, paidMonths } = COMMERCIAL_ANNUAL_POLICY;
  const cycleTotal = safeAmount(monthly.monthlyTotal * paidMonths, "El total anual");
  const undiscountedYear = safeAmount(monthly.monthlyTotal * monthsInYear, "El total anual sin descuento");
  return {
    ...monthly,
    billingCycle: "ANNUAL" as const,
    cycleTotal,
    monthlyEquivalent: cycleTotal / monthsInYear,
    savings: undiscountedYear - cycleTotal,
    freeMonths: monthsInYear - paidMonths,
    paidMonths,
  };
}

/**
 * Read-only compatibility helper for the local simulator. Production billing
 * continues to use its existing calculation paths until a later integration.
 */
export function quoteLegacyPlan(input: {
  plan: string;
  billingCycle: string;
  extraStaffCount: number;
}): LegacyQuote {
  const plan = input.plan as LegacyPlanCode;
  const metadata = COMMERCIAL_PLAN_METADATA[plan];
  if (!metadata?.legacy) {
    throw new CommercialCatalogError(
      "INVALID_PLAN",
      "Plan legacy desconocido: " + input.plan,
    );
  }
  if (input.billingCycle !== "MONTHLY" && input.billingCycle !== "ANNUAL") {
    throw new CommercialCatalogError(
      "UNSUPPORTED_BILLING_CYCLE",
      "Ciclo legacy desconocido: " + input.billingCycle,
    );
  }
  const extraStaffCount = nonNegativeSafeInteger(input.extraStaffCount);
  const extraCost =
    plan === "EQUIPO"
      ? safeAmount(extraStaffCount * EXTRA_STAFF_COST.EQUIPO, "El costo legacy de extras")
      : 0;
  const monthlyTotal = safeAmount(metadata.baseMonthly + extraCost, "El total legacy");
  const total =
    input.billingCycle === "ANNUAL"
      ? safeAmount(monthlyTotal * ANNUAL_MULTIPLIER, "El total anual legacy")
      : monthlyTotal;

  return {
    catalogVersion: "legacy-current",
    plan,
    displayName: metadata.displayName,
    legacy: true,
    billingCycle: input.billingCycle,
    currencyCode: COMMERCIAL_CURRENCY,
    extraStaffCount,
    baseMonthly: metadata.baseMonthly,
    extraCost,
    total,
  };
}

/** Local V2 contract quotation. Provider adapters must explicitly support its cycle. */
export function quoteCommercialContract(input: CommercialQuoteInput) {
  if (input.billingCycle === "ANNUAL") return quoteCommercialAnnualPlan(input);
  return quoteCommercialPlan(input);
}
