import { COMMERCIAL_CATALOG_VERSION, quoteCommercialContract } from "@/core/commercial-catalog";
import { commercialSelectionSchema, type CommercialSelection } from "./commercial-selection";

export const V2_OPEN_STATUSES = ["PREPARED", "EXECUTING", "UNKNOWN", "AWAITING_PAYMENT", "SCHEDULED", "PAID"];
export function v2Quote(selection: CommercialSelection) {
  return quoteCommercialContract({ ...commercialSelectionSchema.parse(selection), catalogVersion: COMMERCIAL_CATALOG_VERSION });
}
export function includedVat(total: number) {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("INVALID_CLP_AMOUNT");
  const net = Math.round(total * 100 / 119);
  return { total, net, vat: total - net };
}
/** UTC calendar arithmetic preserves the original billing day across short months. */
export function billingPeriodEnd(start: Date, cycle: "MONTHLY" | "ANNUAL", anchorDay = start.getUTCDate()) {
  const end = new Date(start);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + (cycle === "ANNUAL" ? 12 : 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(anchorDay, last));
  return end;
}
export function changeTiming(current: CommercialSelection, target: CommercialSelection) {
  if (current.billingCycle !== target.billingCycle) throw new Error("BILLING_CYCLE_CHANGE_REQUIRES_RENEWAL");
  if (current.plan === target.plan && current.professionalTotal === target.professionalTotal) throw new Error("SELECTION_UNCHANGED");
  // Mixed expansion/reduction takes effect at renewal; never withdraw paid capacity.
  return target.professionalTotal >= current.professionalTotal &&
    (target.plan === current.plan || target.plan === "PURAGENDA_PLUS") ? "IMMEDIATE" : "NEXT_RENEWAL";
}
/** One supplemental payment buys only the remaining part of the paid period. */
export function expansionAmount(current: CommercialSelection, target: CommercialSelection, start: Date, end: Date, effectiveAt: Date) {
  const duration = +end - +start, remaining = +end - +effectiveAt;
  if (duration <= 0 || remaining <= 0 || remaining > duration) throw new Error("VALID_PAID_PERIOD_REQUIRED");
  const delta = v2Quote(target).cycleTotal - v2Quote(current).cycleTotal;
  if (delta <= 0) throw new Error("POSITIVE_EXPANSION_REQUIRED");
  return Math.ceil(delta * remaining / duration);
}
