import type { Paddle } from "@paddle/paddle-node-sdk";
import { quoteCommercialPlan, type CommercialQuoteInput } from "@/core/commercial-catalog";
import { commercialInteger } from "./commercial-internal";

type PaddleUpdate = Parameters<Paddle["subscriptions"]["previewUpdate"]>[1];
export type CommercialRecurringLine = { code: string; quantity: number; unitAmountClp: number; amountClp: number };
export function prepareCommercialBillingDraft(input: CommercialQuoteInput) {
  const quote = quoteCommercialPlan(input);
  commercialInteger(quote.monthlyTotal);
  const lines: CommercialRecurringLine[] = [{ code: quote.plan, quantity: 1, unitAmountClp: quote.baseMonthly, amountClp: quote.baseMonthly },
    ...quote.surchargeSteps.map(step => ({ code: `seats.${step.fromProfessional}`, quantity: step.quantity, unitAmountClp: step.unitAmount, amountClp: step.subtotal }))];
  return { quote, lines, recurringAmountClp: quote.monthlyTotal, currencyCode: quote.currencyCode,
    executable: false as const, blockers: ["TAX_POLICY_UNRESOLVED", "PROVIDER_SANDBOX_VALIDATION_REQUIRED", "PUBLIC_LAUNCH_DISABLED"] };
}
export type CommercialBillingAdapter = {
  readonly provider: "MERCADO_PAGO" | "PADDLE";
  preview(draft: ReturnType<typeof prepareCommercialBillingDraft>): Promise<{
    status: "PREVIEW" | "UNKNOWN" | "UNSUPPORTED"; immediateAmountClp: number | null;
    recurringAmountClp: number | null; currencyCode: string; taxAmountClp: number | null;
  }>;
};
/** Full replacement draft, for review only. No SDK instance/API call is created. */
export function preparePaddleUpdateDraft(input: CommercialQuoteInput, prices: Record<string, { priceId: string; unitAmountClp: number; currencyCode: string; monthly: boolean }>, retainedItems: { priceId: string; quantity: number }[], mode: NonNullable<PaddleUpdate["prorationBillingMode"]>, status: string) {
  if (status === "past_due") throw new Error("PAST_DUE_REQUIRES_RECOVERY");
  if (["trialing", "paused"].includes(status) && mode !== "do_not_bill") throw new Error("INVALID_PRORATION_FOR_STATUS");
  const draft = prepareCommercialBillingDraft(input);
  const items = draft.lines.map(line => {
    const price = prices[line.code];
    if (!price || !/^pri_[a-z0-9]{26}$/.test(price.priceId) || price.unitAmountClp !== line.unitAmountClp || price.currencyCode !== "CLP" || !price.monthly) throw new Error("PRICE_MAPPING_MISMATCH");
    return { priceId: price.priceId, quantity: line.quantity };
  });
  for (const item of retainedItems) { commercialInteger(item.quantity, 1); if (!/^pri_[a-z0-9]{26}$/.test(item.priceId)) throw new Error("INVALID_RETAINED_ITEM"); }
  const all = [...items, ...retainedItems];
  if (new Set(all.map(item => item.priceId)).size !== all.length) throw new Error("DUPLICATE_RECURRING_ITEM");
  const payload: PaddleUpdate = { items: all, currencyCode: "CLP", prorationBillingMode: mode, onPaymentFailure: "prevent_change" };
  return { ...draft, payload, blockers: [...draft.blockers, "RETAINED_ITEMS_TAX_AND_WEBSITE_DOUBLE_CHARGE_REVIEW_REQUIRED"] };
}
export function prepareMercadoPagoUpdateDraft(input: CommercialQuoteInput) {
  return { ...prepareCommercialBillingDraft(input), provider: "MERCADO_PAGO" as const,
    status: "UNSUPPORTED_UNTIL_SANDBOX_VALIDATION" as const, prorationPolicy: null, effectiveBillingDate: null };
}
