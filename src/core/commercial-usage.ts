export type CommercialUsageItem = {
  key: string; title: string; included: boolean; configured: boolean;
  limit: number; used: number; reserved: number; remaining: number;
  resetsAt?: string;
  state: "AVAILABLE" | "NEAR_LIMIT" | "EXHAUSTED" | "PAUSED" | "UNCONFIGURED" | "EXCLUSIVE" | "INACTIVE";
};
export type CommercialUsageSummary = {
  plan: "PURAGENDA" | "PURAGENDA_PLUS"; active: boolean; trial: boolean;
  resetsAt: string; periodLabel: string; items: CommercialUsageItem[];
};
export function commercialUsageMessage(code: string): string | null {
  if (["BUDGET_EXHAUSTED", "OPERATION_BUDGET_EXHAUSTED"].includes(code)) return "Alcanzaste el cupo disponible de Puri. Revisa tu consumo y la fecha de renovación del cupo.";
  if (["UNKNOWN_COST_UNRECONCILED", "MODEL_OUTCOME_UNKNOWN"].includes(code)) return "Puri está temporalmente en pausa mientras verificamos una consulta anterior. Tu información está guardada.";
  if (["COMMERCIAL_USAGE_LIMITS_UNDEFINED", "INVALID_COMMERCIAL_USAGE_POLICY", "BUDGET_NOT_CONFIGURED", "MODEL_PRICE_UNKNOWN"].includes(code)) return "Estamos preparando el cupo de Puri de tu plan. Inténtalo más tarde o contacta a soporte.";
  if (["QUOTA_EXHAUSTED", "CAMPAIGN_QUOTA_EXHAUSTED"].includes(code)) return "Alcanzaste el cupo de Contact Flow para este periodo. Revisa cuándo vuelve a estar disponible.";
  if (["PLUS_ENTITLEMENT_REQUIRED", "CONTACT_FLOW_ENTITLEMENT_REQUIRED"].includes(code)) return "Esta función está incluida en Puragenda+. También puedes usarla durante una prueba vigente de ese plan.";
  return null;
}
