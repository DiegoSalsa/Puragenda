import { getStaffLimit } from "@/core/subscription-plan";
import { calculateNextBillingPreview, type BillingSubscriptionInput } from "./subscription-billing.service";

type ReportSubscription = BillingSubscriptionInput & {
  status: string;
  isTrial: boolean;
  staffLimitOverride?: number | null;
  paddleSubscriptionId?: string | null;
};

export function getAdminSubscriptionReport(
  subscription: ReportSubscription,
  business: { countryCode: string; currencyCode?: string },
  now = new Date(),
) {
  const preview = calculateNextBillingPreview(subscription);
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isManual = subscription.paymentMethod === "BANK_TRANSFER";
  const isCourtesy = !isManual && !subscription.mpSubscriptionId && !subscription.paddleSubscriptionId &&
    subscription.status === "ACTIVE" && !subscription.isTrial && !!periodEnd && periodEnd > now;
  // A retained provider ID is historical information, not evidence of an automatic charge.
  const method = isManual ? "BANK_TRANSFER" : subscription.paddleSubscriptionId ? "PADDLE" :
    subscription.mpSubscriptionId ? "MERCADO_PAGO" : isCourtesy ? "COURTESY" : "UNCONFIRMED";
  const methodLabel = {
    BANK_TRANSFER: "Transferencia bancaria",
    MERCADO_PAGO: "Mercado Pago · automático",
    PADDLE: "Paddle · automático",
    COURTESY: "Cortesía sin tarjeta",
    UNCONFIRMED: "Sin modalidad confirmada",
  }[method];
  // The local catalog is CLP. Do not invent exchange rates or apply it to international accounts.
  const isClp = business.countryCode === "CL";
  const manualExpired = isManual && !!periodEnd && periodEnd <= now;
  const contributesRevenue = isClp && subscription.status === "ACTIVE" && !subscription.isTrial &&
    !manualExpired && method !== "COURTESY" && method !== "UNCONFIRMED";
  const formatAmount = (amount: number) => `$${amount.toLocaleString("es-CL")} CLP`;
  const amountDue = isClp ? preview.amountDue : null;
  const baseAmount = isClp ? preview.baseAmount : null;
  return {
    plan: subscription.plan,
    method,
    methodLabel,
    isManual,
    isCourtesy,
    manualExpired,
    currencyCode: isClp ? "CLP" : business.currencyCode ?? null,
    baseAmount,
    amountDue,
    amountLabel: amountDue === null ? "Consultar importe en proveedor" : formatAmount(amountDue),
    baseAmountLabel: baseAmount === null ? "Tarifa internacional" : formatAmount(baseAmount),
    cycleLabel: subscription.billingCycle === "ANNUAL" ? "anual" : "mensual",
    staffLimit: getStaffLimit(subscription),
    hasCustomStaffLimit: subscription.staffLimitOverride != null,
    hasCustomPrice: isManual && subscription.customMonthlyPriceClp != null,
    periodEnd: periodEnd?.toISOString() ?? null,
    monthlyRevenueClp: contributesRevenue ? preview.baseAmount / (subscription.billingCycle === "ANNUAL" ? 12 : 1) : 0,
    nextTransferClp: contributesRevenue && isManual ? preview.amountDue : 0,
    nextAutomaticClp: contributesRevenue && method === "MERCADO_PAGO" ? preview.mpAmount : 0,
  };
}

export type AdminSubscriptionReport = ReturnType<typeof getAdminSubscriptionReport>;

export function readManualPaymentEvidence(details: string | null) {
  try {
    const value: unknown = JSON.parse(details ?? "null");
    if (!value || typeof value !== "object") return null;
    const payment = value as Record<string, unknown>;
    if (payment.currency !== "CLP" || typeof payment.amountClp !== "number" || !Number.isSafeInteger(payment.amountClp) || payment.amountClp <= 0 ||
      typeof payment.reference !== "string" || typeof payment.paidFrom !== "string" || typeof payment.paidThrough !== "string" ||
      !Number.isFinite(Date.parse(payment.paidFrom)) || !Number.isFinite(Date.parse(payment.paidThrough)) || Date.parse(payment.paidFrom) >= Date.parse(payment.paidThrough)) return null;
    return { amountClp: payment.amountClp, reference: payment.reference, paidFrom: payment.paidFrom, paidThrough: payment.paidThrough };
  } catch { return null; }
}

export function getAdminRevenueSummary(reports: AdminSubscriptionReport[]) {
  return {
    monthlyRevenueClp: Math.round(reports.reduce((sum, report) => sum + report.monthlyRevenueClp, 0)),
    nextTransferClp: reports.reduce((sum, report) => sum + report.nextTransferClp, 0),
    nextAutomaticClp: reports.reduce((sum, report) => sum + report.nextAutomaticClp, 0),
    internationalCount: reports.filter(report => report.currencyCode !== "CLP").length,
  };
}
