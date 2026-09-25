import { puriTools } from "./definitions";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasPermission } from "./context";
import { buildPuriSystemPrompt } from "./prompt";
import { getPuriOpenAI, PURI_MODEL } from "./openai-client";
import { executePuriTool, puriToolNames } from "./tools";
import { PuriAccessError, type PuriAnswer, type PuriCard, type PuriContext, type PuriHistoryItem } from "./types";

const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 4;

type Evidence = { name: string; data: Record<string, unknown> };
const copy: Record<string, { today: string; pending: string; collected: string; unavailable: string; forbidden: string }> = {
  es: { today: "Citas hoy", pending: "Pendiente", collected: "Cobrado", unavailable: "No pude verificar ese dato en este momento.", forbidden: "No tienes acceso a esos datos." },
  en: { today: "Today's appointments", pending: "Pending", collected: "Collected", unavailable: "I couldn't verify that information right now.", forbidden: "You don't have access to that information." },
  pt: { today: "Agendamentos de hoje", pending: "Pendente", collected: "Recebido", unavailable: "Não consegui verificar esses dados agora.", forbidden: "Você não tem acesso a esses dados." },
  fr: { today: "Rendez-vous du jour", pending: "En attente", collected: "Encaissé", unavailable: "Je n'ai pas pu vérifier cette information pour le moment.", forbidden: "Vous n'avez pas accès à ces données." },
  it: { today: "Appuntamenti di oggi", pending: "In sospeso", collected: "Incassato", unavailable: "Non sono riuscito a verificare questi dati ora.", forbidden: "Non hai accesso a questi dati." },
  de: { today: "Heutige Termine", pending: "Offen", collected: "Eingenommen", unavailable: "Ich konnte diese Daten gerade nicht überprüfen.", forbidden: "Du hast keinen Zugriff auf diese Daten." },
  "zh-CN": { today: "今日预约", pending: "待处理", collected: "已收款", unavailable: "目前无法核实这些数据。", forbidden: "你无权查看这些数据。" },
};

function labels(locale: string) { return copy[locale] ?? copy.es; }

function verifiedCards(evidence: Evidence[], context: PuriContext): PuriCard[] {
  const cards: PuriCard[] = [];
  const t = labels(context.locale);
  for (const { name, data } of evidence) {
    if (name === "getTodayOverview") {
      const counts = data.counts as Record<string, number> | undefined;
      if (counts) {
        cards.push({ type: "metric", label: t.today, value: counts.appointments ?? 0, unit: "count" });
        if (data.canSeeMoney) cards.push({ type: "metric", label: t.pending, value: counts.pending ?? 0, unit: "money", currencyCode: context.business.currencyCode });
      }
    }
    if (name === "getRevenueSummary") {
      cards.push({ type: "metric", label: t.collected, value: Number(data.collected ?? 0), unit: "money", currencyCode: context.business.currencyCode });
      cards.push({ type: "metric", label: t.pending, value: Number(data.pending ?? 0), unit: "money", currencyCode: context.business.currencyCode });
    }
    if (name === "getAvailability") {
      const times = Array.isArray(data.times) ? data.times as Array<{ localTime: string }> : [];
      cards.push({ type: "availability", label: String(data.date ?? ""), value: String(data.availableTimesCount ?? times.length), detail: times.slice(0, 8).map((time) => time.localTime).join(" · ") });
    }
    if (name === "getClientActivity") {
      const clients = Array.isArray(data.clients) ? data.clients as Array<{ name: string; count: number; lastVisit: { localDate: string; localTime: string } | null }> : [];
      for (const client of clients.slice(0, 5)) cards.push({ type: "client", label: client.name, value: String(client.count), detail: client.lastVisit ? `${client.lastVisit.localDate} · ${client.lastVisit.localTime}` : undefined });
    }
  }
  return cards.slice(0, 8);
}

function verifiedActions(evidence: Evidence[], context: PuriContext): PuriAnswer["actions"] {
  const names = new Set(evidence.map((item) => item.name));
  const actions: PuriAnswer["actions"] = [];
  if (["getTodayOverview", "getAppointments", "getAvailability"].some((name) => names.has(name))) actions.push({ id: "agenda", href: "/dashboard/agenda" });
  if (["searchClients", "getClientSummary", "getClientActivity"].some((name) => names.has(name)) && hasPermission(context, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE)) actions.push({ id: "clients", href: "/dashboard/clients" });
  if (["getRevenueSummary", "comparePeriods", "getServicesSummary", "getStaffSummary"].some((name) => names.has(name)) && (hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN) || hasPermission(context, DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS))) actions.push({ id: "analytics", href: "/dashboard/analytics" });
  if (names.has("getLoyaltySummary")) actions.push({ id: "loyalty", href: "/dashboard/loyalty" });
  if (names.has("getRecurringSummary")) actions.push({ id: "recurring", href: "/dashboard/recurring" });
  if (names.has("getGiftCardsSummary")) actions.push({ id: "giftCards", href: "/dashboard/gift-cards" });
  if (names.has("getStoryInsights")) actions.push({ id: "stories", href: "/dashboard/stories" });
  return actions.slice(0, 4);
}

function parseModelMessage(text: string, locale: string) {
  try { const value = JSON.parse(text) as { message?: unknown }; return typeof value.message === "string" && value.message.trim() ? value.message.trim() : labels(locale).unavailable; }
  catch { return labels(locale).unavailable; }
}

export async function answerWithPuri(input: { context: PuriContext; message: string; history: PuriHistoryItem[] }): Promise<PuriAnswer> {
  const openai = getPuriOpenAI();
  const toolsUsed: string[] = [];
  const evidence: Evidence[] = [];
  const failures: string[] = [];
  const history = input.history.slice(-MAX_HISTORY).filter((item) => item.content.length <= 2_000);
  const modelInput: Array<Record<string, unknown>> = [
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: input.message.slice(0, 2_000) },
  ];
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await openai.responses.create({
      model: PURI_MODEL,
      instructions: buildPuriSystemPrompt(input.context),
      input: modelInput as never,
      tools: puriTools as never,
      tool_choice: round === 0 ? "required" : "auto",
      parallel_tool_calls: false,
      text: { format: { type: "json_schema", name: "puri_answer", strict: true, schema: { type: "object", properties: { message: { type: "string" } }, required: ["message"], additionalProperties: false } } },
      max_output_tokens: 1_200,
      reasoning: { effort: "low" },
      store: false,
    });
    const calls = (response.output as unknown[]).filter((item): item is { type: "function_call"; name: string; arguments: string; call_id: string } => (item as { type?: string }).type === "function_call");
    if (calls.length === 0) return { message: evidence.length ? parseModelMessage(response.output_text ?? "", input.context.locale) : failures.includes("FORBIDDEN") ? labels(input.context.locale).forbidden : labels(input.context.locale).unavailable, cards: verifiedCards(evidence, input.context), actions: verifiedActions(evidence, input.context), toolsUsed };
    modelInput.push(...(response.output as unknown as Array<Record<string, unknown>>));
    for (const call of calls) {
      if (puriToolNames.includes(call.name as (typeof puriToolNames)[number])) toolsUsed.push(call.name);
      let result: unknown;
      try {
        result = calls.indexOf(call) < 4 ? await executePuriTool(call.name, JSON.parse(call.arguments), input.context) : { verified: false, error: "TOOL_LIMIT" };
        if (result && typeof result === "object" && !("verified" in result && result.verified === false)) evidence.push({ name: call.name, data: result as Record<string, unknown> });
      }
      catch (error) { const code = error instanceof PuriAccessError ? error.code : "TOOL_FAILED"; failures.push(code); result = { verified: false, error: code }; }
      modelInput.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
  }
  return { message: labels(input.context.locale).unavailable, cards: verifiedCards(evidence, input.context), actions: verifiedActions(evidence, input.context), toolsUsed };
}
