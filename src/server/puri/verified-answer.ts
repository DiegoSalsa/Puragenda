import type { PuriContext } from "./types";

// The model selects read tools; only the server's allowlisted facts form the
// operational answer. Never interpret a retrieved name or model prose as a receipt.
const fields: Record<string, [string, string]> = {
  date: ["Fecha", "Date"], period: ["Período", "Period"], timezone: ["Zona horaria", "Timezone"],
  dateStart: ["Desde", "From"], dateEnd: ["Hasta (exclusivo)", "Until (exclusive)"],
  name: ["Nombre", "Name"], customerName: ["Cliente", "Client"], serviceName: ["Servicio", "Service"],
  staffName: ["Profesional", "Professional"], localDate: ["Fecha local", "Local date"], localTime: ["Hora local", "Local time"],
  status: ["Estado", "Status"], appointments: ["Citas", "Appointments"], cancelled: ["Canceladas", "Cancelled"],
  collected: ["Cobrado registrado", "Recorded collections"], pending: ["Pendiente", "Pending"], due: ["Valor nominal", "Nominal value"],
  projected: ["Valor proyectado", "Projected value"], completed: ["Atendidas", "Attended"],
  averageTicket: ["Valor nominal medio", "Mean nominal value"], totalPrice: ["Valor de la reserva", "Booking value"],
  bookedValue: ["Valor reservado nominal", "Nominal booked value"], averageBookedValue: ["Valor reservado medio", "Mean booked value"],
  visits: ["Visitas", "Visits"], count: ["Cantidad", "Count"], noShowCount: ["Inasistencias", "No-shows"],
  currentStamps: ["Sellos actuales", "Current stamps"], totalSpent: ["Gasto histórico registrado", "Recorded historical spend"],
  participants: ["Participantes", "Participants"], stampsDelivered: ["Sellos entregados", "Stamps delivered"],
  rewardsGenerated: ["Recompensas generadas", "Rewards generated"], stampsRequired: ["Sellos necesarios", "Required stamps"],
  nearRewardCount: ["Cerca de recompensa", "Near reward"], issued: ["Emitidas", "Issued"], active: ["Activas", "Active"],
  used: ["Agotadas", "Depleted"], remainingBalance: ["Saldo pendiente", "Remaining balance"], currencyCode: ["Moneda", "Currency"],
  availableTimesCount: ["Horarios disponibles", "Available times"], totalOpeningsAcrossStaff: ["Huecos entre profesionales", "Openings across professionals"],
  collectedPercent: ["Cambio de cobrado (%)", "Collections change (%)"], appointmentsPercent: ["Cambio de citas (%)", "Appointments change (%)"],
  completedPercent: ["Cambio de atendidas (%)", "Attended change (%)"], bookings: ["Reservas", "Bookings"], revenue: ["Ingreso atribuido técnicamente", "Technically attributed revenue"],
};
const groups = new Set(["counts", "appointments", "availability", "times", "clients", "services", "staff", "current", "previous", "changes", "lastVisit", "nextAppointment", "start", "end", "recurring", "nearReward", "balances", "statuses", "totals", "recent"]);
export function verifiedMessage(evidence: Array<{ name: string; data: Record<string, unknown> }>, context: PuriContext) {
  const es = context.locale === "es", lines: string[] = [];
  function walk(data: Record<string, unknown>, depth = 0) {
    if (depth > 4 || lines.length >= 55) return;
    for (const [key, value] of Object.entries(data)) {
      if (lines.length >= 55) break;
      const field = fields[key];
      if (field && (typeof value === "number" || typeof value === "string")) {
        const safe = typeof value === "string" ? JSON.stringify(value.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 160)) : Number.isFinite(value) ? value : null;
        if (safe !== null) lines.push(`${field[es ? 0 : 1]}: ${safe}`);
      }
      if (groups.has(key)) {
        if (Array.isArray(value)) {
          if (!value.length && field) lines.push(`${field[es ? 0 : 1]}: 0`);
          for (const item of value.slice(0, 8)) if (item && typeof item === "object") walk(item as Record<string, unknown>, depth + 1);
        } else if (value && typeof value === "object") walk(value as Record<string, unknown>, depth + 1);
      }
    }
  }
  for (const item of evidence) {
    if (item.name === "comparePeriods") {
      for (const key of ["current", "previous"] as const) {
        lines.push(es ? key === "current" ? "Período actual:" : "Período anterior:" : `${key}:`);
        if (item.data[key] && typeof item.data[key] === "object") walk(item.data[key] as Record<string, unknown>);
      }
      if (item.data.changes && typeof item.data.changes === "object") walk(item.data.changes as Record<string, unknown>);
    } else walk(item.data);
    if (item.data.hasMore) lines.push(es ? "Hay más resultados en el módulo de Agenda." : "More results are available in Agenda.");
  }
  const money = evidence.some(e => ["getRevenueSummary", "comparePeriods", "getServicesSummary", "getStaffSummary"].includes(e.name));
  const definition = money ? es
    ? "\nCobrado registrado incluye abonos y pagos aprobados, Gift Cards y liquidaciones registradas de las citas del período; excluye canceladas. El valor reservado es nominal, no un cobro. El período se basa en la fecha de la cita, no en la del movimiento bancario."
    : "\nRecorded collections include approved deposits/payments, Gift Cards and recorded settlements for appointments in the period; cancelled appointments are excluded. Booked value is nominal, not a collection. Periods follow appointment dates, not bank movement dates." : "";
  return ((es ? "Datos verificados en tu alcance autorizado:\n" : "Verified data within your authorized scope:\n") + (lines.join("\n") || (es ? "Sin resultados disponibles." : "No results available."))).slice(0, 3600) + definition;
}
