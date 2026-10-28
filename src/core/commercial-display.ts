export function commercialStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = { DRAFT: "Sin contratar", PENDING_PAYMENT: "Pendiente de pago", ACTIVE: "Activa", TRIALING: "Período de prueba",
    PAST_DUE_GRACE: "Pago pendiente", PAST_DUE_BLOCKED: "Pago vencido", SCHEDULED_CHANGE: "Activa hasta el fin del período pagado",
    INACTIVE: "Inactiva", CANCELLED: "Cancelada", CONFIRMED: "Confirmado", REJECTED: "Rechazado", REFUNDED: "Devuelto", CHARGEBACK: "Pago objetado" };
  return status ? labels[status] ?? "Pendiente de revisión" : "Sin confirmar";
}
