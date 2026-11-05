/** Display grouping only: persisted billing terms and access gates remain authoritative. */
export function commercialPlanGroup(plan: string | null | undefined): "PURAGENDA" | "PURAGENDA_PLUS" {
  const normalized = plan?.trim().toUpperCase();
  return normalized === "PURAGENDA_PLUS" || normalized === "PURAGENDA+" ? "PURAGENDA_PLUS" : "PURAGENDA";
}

export function commercialPlanName(plan: string | null | undefined) {
  return !plan ? "Sin plan" : commercialPlanGroup(plan) === "PURAGENDA_PLUS" ? "Puragenda+" : "Puragenda";
}

export function contractedProfessionalsLabel(total: number) {
  return `${total} ${total === 1 ? "profesional contratado" : "profesionales contratados"}`;
}

export function commercialStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = { DRAFT: "Sin contratar", PENDING_PAYMENT: "Pendiente de pago", ACTIVE: "Activa", TRIALING: "Período de prueba",
    PAST_DUE_GRACE: "Pago pendiente", PAST_DUE_BLOCKED: "Pago vencido", SCHEDULED_CHANGE: "Activa hasta el fin del período pagado",
    INACTIVE: "Inactiva", CANCELLED: "Cancelada", CONFIRMED: "Confirmado", REJECTED: "Rechazado", REFUNDED: "Devuelto", CHARGEBACK: "Pago objetado" };
  return status ? labels[status] ?? "Pendiente de revisión" : "Sin confirmar";
}
