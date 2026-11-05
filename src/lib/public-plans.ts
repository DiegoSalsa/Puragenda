import { COMMERCIAL_ANNUAL_POLICY, COMMERCIAL_CATALOG_VERSION, quoteCommercialAnnualPlan, quoteCommercialPlan, type CommercialCapability, type CommercialPlanCode } from "@/core/commercial-catalog";
import { TRIAL_DURATION_DAYS } from "@/core/constants";

export const PUBLIC_PLAN_CODES = ["PURAGENDA", "PURAGENDA_PLUS"] as const;

export function publicMonthlyQuote(plan: CommercialPlanCode, professionalTotal = 1) {
  return quoteCommercialPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan, professionalTotal, billingCycle: "MONTHLY" });
}

export function publicAnnualQuote(plan: CommercialPlanCode, professionalTotal = 1) {
  return quoteCommercialAnnualPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan, professionalTotal });
}

export function formatPublicClp(amount: number) {
  return `$${new Intl.NumberFormat("es-CL").format(amount)}`;
}

export const PUBLIC_PLAN_STARTING_PRICES = `Puragenda desde ${formatPublicClp(publicMonthlyQuote("PURAGENDA").monthlyTotal)} y Puragenda+ desde ${formatPublicClp(publicMonthlyQuote("PURAGENDA_PLUS").monthlyTotal)} CLP/mes, IVA incluido.`;
export const PUBLIC_PLANS_PRICE_SUMMARY = `${PUBLIC_PLAN_STARTING_PRICES} Ambos parten con un profesional; el total aumenta según la cantidad elegida y la escala progresiva de Precios.`;
export const PUBLIC_TRIAL_NOTE = `Prueba el plan que elijas durante ${TRIAL_DURATION_DAYS} días sin tarjeta. En Puragenda+ puedes usar agenda, sitio web, Puri avanzado y Contact Flow, con límites de uso para la prueba. No se realizan cobros automáticos durante esos ${TRIAL_DURATION_DAYS} días.`;
export const PUBLIC_PLUS_GROWTH_FEATURES = [
  { capability: "puri.plus", label: "Puri avanzado: inteligencia comercial, análisis del negocio y recomendaciones para detectar oportunidades." },
  { capability: "contact_flow", label: "Contact Flow: automatizaciones para recuperar clientes, reactivarlos y fomentar nuevas reservas." },
] as const satisfies readonly { capability: CommercialCapability; label: string }[];
export const PLUS_GROWTH_SUMMARY = PUBLIC_PLUS_GROWTH_FEATURES.map((feature) => feature.label).join(" ");
export const PUBLIC_ANNUAL_NOTE = `Al pagar anualmente recibes ${COMMERCIAL_ANNUAL_POLICY.monthsInYear - COMMERCIAL_ANNUAL_POLICY.paidMonths} meses gratis: pagas ${COMMERCIAL_ANNUAL_POLICY.paidMonths} meses y usas Puragenda durante ${COMMERCIAL_ANNUAL_POLICY.monthsInYear}. El descuento también se aplica a los profesionales adicionales. El total anual se muestra con IVA incluido.`;
