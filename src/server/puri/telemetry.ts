export const PURI_ANALYTICS_TIMEZONE = "America/Santiago";
export const PURI_HABITUAL_DAYS = 3;
export const PURI_HABITUAL_WINDOW_DAYS = 7;

export type PuriToolStatus = "SUCCESS" | "NO_DATA" | "DENIED" | "INVALID_SCOPE" | "ERROR" | "TIMEOUT";
export type PuriRequestStatus = "SUCCESS" | "NO_DATA" | "DENIED" | "ERROR" | "TIMEOUT";
export type PuriToolTelemetry = {
  toolName: string;
  status: PuriToolStatus;
  errorCode?: string;
  resultCount?: number;
  durationMs: number;
};
export type PuriTelemetry = {
  model: string;
  modelDurationMs: number;
  toolsDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  toolCalls: PuriToolTelemetry[];
};

export function emptyPuriTelemetry(model: string): PuriTelemetry {
  return { model, modelDurationMs: 0, toolsDurationMs: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, toolCalls: [] };
}

const INTENT_BY_TOOL: Record<string, string> = {
  getTodayOverview: "agenda", getAppointments: "agenda", getAvailability: "disponibilidad",
  searchClients: "clientes", getClientSummary: "clientes", getClientActivity: "clientes",
  getRevenueSummary: "cobros", comparePeriods: "comparacion_periodos",
  getServicesSummary: "servicios", getStaffSummary: "profesionales",
  getLoyaltySummary: "fidelizacion", getGiftCardsSummary: "gift_cards",
  getRecurringSummary: "recurrentes", getStoryInsights: "stories_marketing",
};

export function intentFromTools(calls: PuriToolTelemetry[], message: string): string {
  // Only classify high-confidence write requests. No message text is retained.
  if (/(cancel|anul|elimin|borr|mov|reagend|reprogram|edit|modific|marc|registr|actualiz|delete|reschedul|refund|reembols)/i.test(message)
    && /(cita|turno|appointment|pago|payment|cliente|client|reserva|booking|informaci[oó]n)/i.test(message)) return "ACTION_REQUEST_UNSUPPORTED";
  const known = calls.find((call) => INTENT_BY_TOOL[call.toolName]);
  if (known) return INTENT_BY_TOOL[known.toolName];
  return "unknown";
}

export function toolResultCount(name: string, result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  const data = result as Record<string, unknown>;
  const keys: Record<string, string> = {
    getAppointments: "appointments", getAvailability: "availableTimesCount", searchClients: "clients",
    getClientActivity: "clients", getServicesSummary: "services", getStaffSummary: "staff",
    getRecurringSummary: "statuses", getStoryInsights: "recent",
  };
  if (name === "getStoryInsights" && data.totals != null) return undefined;
  const value = data[keys[name]];
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

export function toolFailureStatus(code: string): PuriToolStatus {
  if (code === "FORBIDDEN" || code === "STAFF_FORBIDDEN" || code === "UNKNOWN_TOOL") return "DENIED";
  if (code === "LOCATION_FORBIDDEN" || code === "LOCATION_REQUIRED" || code === "CLIENT_NOT_FOUND") return "INVALID_SCOPE";
  if (code === "TIMEOUT" || code === "ETIMEDOUT") return "TIMEOUT";
  return "ERROR";
}

export function requestStatus(calls: PuriToolTelemetry[]): PuriRequestStatus {
  if (calls.some((call) => call.status === "SUCCESS")) return "SUCCESS";
  if (calls.some((call) => call.status === "NO_DATA")) return "NO_DATA";
  if (calls.some((call) => call.status === "DENIED" || call.status === "INVALID_SCOPE")) return "DENIED";
  if (calls.some((call) => call.status === "TIMEOUT")) return "TIMEOUT";
  if (calls.some((call) => call.status === "ERROR")) return "ERROR";
  return "SUCCESS";
}

type ModelPrice = { input: number; output: number; cachedInput?: number };
export function estimatePuriCostUsd(usage: Pick<PuriTelemetry, "model" | "promptTokens" | "completionTokens" | "cachedTokens">): number | null {
  // Exact model prices are configured centrally; missing prices remain unknown.
  let prices: Record<string, ModelPrice>;
  try { prices = JSON.parse(process.env.PURI_MODEL_PRICES_USD_PER_MILLION ?? "{}") as Record<string, ModelPrice>; }
  catch { return null; }
  const price = prices[usage.model];
  if (!price || !Number.isFinite(price.input) || !Number.isFinite(price.output) || price.input < 0 || price.output < 0
    || (price.cachedInput !== undefined && (!Number.isFinite(price.cachedInput) || price.cachedInput < 0))) return null;
  const cached = Math.min(usage.cachedTokens, usage.promptTokens);
  return ((usage.promptTokens - cached) * price.input + cached * (price.cachedInput ?? price.input) + usage.completionTokens * price.output) / 1_000_000;
}
