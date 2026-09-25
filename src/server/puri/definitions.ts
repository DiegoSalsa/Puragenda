const periodEnum = ["today", "tomorrow", "yesterday", "this_week", "next_week", "previous_week", "this_month", "previous_month"];
const object = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required, additionalProperties: false });

export const puriTools = [
  { type: "function", name: "getTodayOverview", description: "Resumen verificado de Hoy. availability.totalOpeningsAcrossStaff suma cupos por profesional; featuredOpportunityTimes es una sola oportunidad destacada. No son la misma cifra.", parameters: object({}, []), strict: true },
  { type: "function", name: "getAppointments", description: "Lista acotada de citas del periodo solicitado dentro del alcance permitido.", parameters: object({ period: { type: "string", enum: periodEnum }, status: { type: ["string", "null"] } }, ["period", "status"]), strict: true },
  { type: "function", name: "getAvailability", description: "Calcula horarios disponibles reales con el motor de Puragenda. availableTimesCount cuenta horas distintas, no capacidad total entre profesionales.", parameters: object({ date: { type: "string", description: "YYYY-MM-DD" }, serviceId: { type: ["string", "null"] }, staffId: { type: ["string", "null"] } }, ["date", "serviceId", "staffId"]), strict: true },
  { type: "function", name: "searchClients", description: "Busca clientes dentro del negocio permitido.", parameters: object({ query: { type: "string" } }, ["query"]), strict: true },
  { type: "function", name: "getClientSummary", description: "Obtiene resumen no sensible de un cliente autorizado.", parameters: object({ clientId: { type: "string" } }, ["clientId"]), strict: true },
  { type: "function", name: "getClientActivity", description: "Obtiene clientes más frecuentes, sin visita reciente o con no-show usando agregados verificados.", parameters: object({ sort: { type: "string", enum: ["frequent", "inactive", "no_show"] } }, ["sort"]), strict: true },
  { type: "function", name: "getRevenueSummary", description: "Calcula cobrado, pendiente, total, completadas y ticket del periodo.", parameters: object({ period: { type: "string", enum: periodEnum } }, ["period"]), strict: true },
  { type: "function", name: "comparePeriods", description: "Compara dos periodos ya calculados por Puragenda.", parameters: object({ current: { type: "string", enum: periodEnum }, previous: { type: "string", enum: periodEnum } }, ["current", "previous"]), strict: true },
  { type: "function", name: "getServicesSummary", description: "Resume servicios reservados y valor reservado (no equivale a cobrado) del periodo.", parameters: object({ period: { type: "string", enum: periodEnum } }, ["period"]), strict: true },
  { type: "function", name: "getStaffSummary", description: "Resume citas y valor reservado (no equivale a cobrado) por profesional sólo para usuarios con visión global.", parameters: object({ period: { type: "string", enum: periodEnum } }, ["period"]), strict: true },
  { type: "function", name: "getLoyaltySummary", description: "Resume fidelización y clientes cerca de recompensa.", parameters: object({}, []), strict: true },
  { type: "function", name: "getGiftCardsSummary", description: "Resume gift cards emitidas, activas y usadas.", parameters: object({}, []), strict: true },
  { type: "function", name: "getRecurringSummary", description: "Resume reservas recurrentes por estado.", parameters: object({}, []), strict: true },
  { type: "function", name: "getStoryInsights", description: "Resume resultados de Stories cuando existen.", parameters: object({}, []), strict: true },
] as const;
