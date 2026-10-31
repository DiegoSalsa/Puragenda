/** Existing one-off promises cannot safely become a recurring price reduction.
 * Preserve every balance until a provider flow and its commercial scope have
 * been verified. This deliberately has no production opt-in switch. */
export function hasPendingCommercialBenefit(sub: {
  pendingDiscountPercentage?: number | null; freeMonthsRemaining?: number;
  promoFreeMonthsRemaining?: number; promoDiscountMonthsRemaining?: number;
  nextBillingOverrideAmount?: number | null; activePrizeId?: string | null;
} | null | undefined) {
  return !!sub && ((sub.pendingDiscountPercentage ?? 0) > 0 || (sub.freeMonthsRemaining ?? 0) > 0
    || (sub.promoFreeMonthsRemaining ?? 0) > 0 || (sub.promoDiscountMonthsRemaining ?? 0) > 0
    || sub.nextBillingOverrideAmount != null || !!sub.activePrizeId);
}
export const V2_BENEFIT_HOLD_MESSAGE = "Tu beneficio se conserva. Su aplicación a este contrato requiere confirmar un cobro compatible; no se modificó tu suscripción ni se consumió el premio.";
