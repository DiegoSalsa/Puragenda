export const LOYALTY_STAMP_LIMITS = { min: 2, max: 30 } as const;
export const LOYALTY_EXPIRATION_OPTIONS = [30, 60, 90] as const;

export type LoyaltyRewardKind = "PERCENTAGE" | "FIXED" | "FREE_SERVICE" | "CUSTOM";

export type LoyaltyRewardCalculation = {
  originalTotal: number;
  discountAmount: number;
  discountedTotal: number;
  automaticallyPriced: boolean;
};

export function calculateLoyaltyReward(input: {
  rewardType: LoyaltyRewardKind;
  discountValue?: number | null;
  freeServiceId?: string | null;
  subtotal: number;
  serviceBasePrices: ReadonlyMap<string, number>;
}): LoyaltyRewardCalculation | { error: string } {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  let discountAmount = 0;

  if (input.rewardType === "PERCENTAGE") {
    const value = Math.floor(Number(input.discountValue ?? 0));
    if (value <= 0 || value > 100) return { error: "El porcentaje del premio no es válido" };
    discountAmount = Math.round(subtotal * value / 100);
  } else if (input.rewardType === "FIXED") {
    const value = Math.floor(Number(input.discountValue ?? 0));
    if (value <= 0) return { error: "El monto del premio no es válido" };
    discountAmount = value;
  } else if (input.rewardType === "FREE_SERVICE") {
    if (!input.freeServiceId) return { error: "El premio no tiene un servicio configurado" };
    const serviceBasePrice = input.serviceBasePrices.get(input.freeServiceId);
    if (serviceBasePrice === undefined) {
      return { error: "Este premio solo se puede usar al reservar el servicio gratuito configurado" };
    }
    // Deliberately exclude option/add-on deltas: FREE_SERVICE covers the canonical
    // base service only, so clients still pay for extras they choose.
    discountAmount = Math.max(0, Math.round(serviceBasePrice));
  } else if (input.rewardType === "CUSTOM") {
    return {
      originalTotal: subtotal,
      discountAmount: 0,
      discountedTotal: subtotal,
      automaticallyPriced: false,
    };
  } else {
    return { error: "El tipo de premio no es válido" };
  }

  discountAmount = Math.min(subtotal, discountAmount);
  return {
    originalTotal: subtotal,
    discountAmount,
    discountedTotal: subtotal - discountAmount,
    automaticallyPriced: true,
  };
}

export function loyaltyRewardLabel(input: {
  rewardType: LoyaltyRewardKind;
  discountValue?: number | null;
  freeServiceName?: string | null;
  rewardName?: string | null;
  currencyCode?: string;
  locale?: string;
}) {
  const english = input.locale?.toLowerCase().startsWith("en") ?? false;
  switch (input.rewardType) {
    case "PERCENTAGE":
      return `${input.discountValue ?? 0}% ${english ? "discount" : "de descuento"}`;
    case "FIXED":
      return new Intl.NumberFormat(english ? "en-US" : "es-CL", {
        style: "currency",
        currency: input.currencyCode ?? "CLP",
        maximumFractionDigits: 0,
      }).format(input.discountValue ?? 0) + (english ? " discount" : " de descuento");
    case "FREE_SERVICE":
      return input.freeServiceName ? `${input.freeServiceName} ${english ? "free" : "gratis"}` : english ? "Free service" : "Servicio gratis";
    case "CUSTOM":
      return input.rewardName || (english ? "Benefit to arrange with the business" : "Beneficio a coordinar con el negocio");
  }
}

export function loyaltyProgressCopy(current: number, required: number) {
  const safeRequired = Math.max(1, required);
  const safeCurrent = Math.max(0, Math.min(current, safeRequired));
  const remaining = safeRequired - safeCurrent;
  if (remaining <= 0) return "¡Premio desbloqueado!";
  if (safeCurrent === 0) return "Tu primera visita ya cuenta";
  if (remaining === 1) return "Te falta solo 1 visita";
  if (safeCurrent / safeRequired >= 0.5) return `¡Vas por la mitad! Te faltan ${remaining} visitas`;
  return `Te faltan ${remaining} visitas`;
}

export type LoyaltyPreviewState = "start" | "progress" | "oneLeft" | "reward";

export function loyaltyPreviewStamps(required: number, state: LoyaltyPreviewState) {
  const safeRequired = Math.max(2, Math.min(30, Math.floor(required)));
  if (state === "start") return 0;
  if (state === "oneLeft") return Math.max(0, safeRequired - 1);
  if (state === "reward") return safeRequired;
  return Math.max(1, Math.round(safeRequired * 0.3));
}

export function calculateLoyaltyRedemptionRate(generated: number, used: number) {
  const safeGenerated = Math.max(0, Math.floor(generated));
  const safeUsed = Math.max(0, Math.min(safeGenerated, Math.floor(used)));
  return safeGenerated === 0 ? 0 : Math.round(safeUsed * 100 / safeGenerated);
}

export function validateLoyaltyNoStacking(input: {
  rewardCode?: string | null;
  promotionId?: string | null;
  discountCode?: string | null;
}) {
  return [input.rewardCode, input.promotionId, input.discountCode].filter(Boolean).length > 1
    ? { error: "No se pueden combinar promociones, premios ni códigos de descuento" }
    : { valid: true as const };
}
