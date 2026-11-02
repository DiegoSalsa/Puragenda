import { z } from "zod";
import { hoursSchema, type SetupHours, type SetupStep } from "./onboarding";

export const setupProposalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("profile"), mode: z.enum(["solo", "team"]), industry: z.string().trim().max(120), professionalCount: z.number().int().min(1).max(100).nullable() }).strict(),
  z.object({ kind: z.literal("hours"), hours: hoursSchema, notes: z.array(z.string().max(240)).max(10) }).strict(),
  z.object({ kind: z.literal("staff"), names: z.array(z.string().trim().min(1).max(100)).min(1).max(10) }).strict(),
  z.object({ kind: z.literal("services"), names: z.array(z.string().trim().min(1).max(100)).min(1).max(10) }).strict(),
  z.object({ kind: z.literal("staff-hours"), staffId: z.string().min(1).max(100), locationId: z.string().min(1).max(100), hours: hoursSchema }).strict(),
  z.object({ kind: z.literal("assign-service"), staffId: z.string().min(1).max(100), serviceId: z.string().min(1).max(100) }).strict(),
]);
export type SetupProposal = z.infer<typeof setupProposalSchema>;
export type SetupPuriResult = {
  mode: "rules" | "ai";
  reason?: "NOT_CONFIGURED" | "PROVIDER_UNAVAILABLE" | "USAGE_LIMIT";
  proposal?: SetupProposal;
  step: SetupStep;
  nextStep?: SetupStep;
};
export const normalizeSetupText = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const DAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const DAYS_RE = "domingo|lunes|martes|miercoles|jueves|viernes|sabado";
const TIME = "([0-2]?\\d)(?::([0-5]\\d))?";
const range = new RegExp(`(?:de|desde|entre)\\s*${TIME}\\s*(?:a|hasta|y|-)\\s*${TIME}(?!\\d)`);
const until = new RegExp(`hasta\\s*(?:las\\s+)?${TIME}(?!\\d)`);
function time(h: string, m?: string) { return Number(h) <= 23 ? `${h.padStart(2, "0")}:${m ?? "00"}` : null; }
function dayNumbers(text: string) {
  if (/todos los dias|toda la semana/.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  const span = text.match(new RegExp(`(${DAYS_RE})\\s*(?:a|al|hasta|-)\\s*(${DAYS_RE})`));
  if (span) { const days = [DAYS.indexOf(span[1])]; while (days.at(-1) !== DAYS.indexOf(span[2]) && days.length < 7) days.push((days.at(-1)! + 1) % 7); return days; }
  return [...new Set([...text.matchAll(new RegExp(DAYS_RE, "g"))].map(m => DAYS.indexOf(m[0])))];
}

/** Conservative offline grammar. It never calls this AI or guesses prices/durations. */
export function parseSetupHours(message: string, baseline: SetupHours): SetupProposal | null {
  const text = normalizeSetupText(message);
  if (/ignora|system prompt|sql|borra|elimina|otro negocio|api.?key|secret|<script/.test(text)) return null;
  const clauses = text.split(new RegExp(`[.;\\n]|\\s+y\\s+(?=(?:los?\\s+)?(?:${DAYS_RE}))|,\\s*(?=(?:los?\\s+|el\\s+)?(?:${DAYS_RE}))`)).filter(s => s.trim());
  const hours = baseline.map(h => ({ ...h }));
  const notes: string[] = [];
  let changed = false;
  for (const clause of clauses) {
    const days = dayNumbers(clause); if (!days.length) continue;
    if (/no (?:atiendo|trabajo|abro)|cerrad[oa]/.test(clause)) { days.forEach(d => { hours.find(h => h.dayOfWeek === d)!.isOpen = false; }); changed = true; continue; }
    const breakAt = clause.search(/colacion|almuerzo|pausa|descanso/);
    const working = breakAt < 0 ? clause : clause.slice(0, breakAt);
    const match = working.match(range); const closing = match ? null : working.match(until);
    if (!match && !closing) return null;
    const open = match ? time(match[1], match[2]) : null;
    const close = match ? time(match[3], match[4]) : time(closing![1], closing![2]);
    const pause = breakAt < 0 ? null : clause.slice(breakAt).match(range);
    if (!close || (match && !open) || (breakAt >= 0 && !pause)) return null;
    const breakStart = pause ? time(pause[1], pause[2]) : null;
    const breakEnd = pause ? time(pause[3], pause[4]) : null;
    if (pause && (!breakStart || !breakEnd)) return null;
    for (const day of days) {
      const prior = hours.find(h => h.dayOfWeek === day)!;
      if (!open) notes.push(`${DAYS[day]}: conservé la apertura ${prior.startTime}; revisa que sea correcta.`);
      Object.assign(prior, { isOpen: true, startTime: open ?? prior.startTime, endTime: close, breakStart, breakEnd });
    }
    changed = true;
  }
  if (!changed || !hoursSchema.safeParse(hours).success) return null;
  return { kind: "hours", hours, notes: [...new Set(notes)].slice(0, 10) };
}
function uniqueNames(source: string) {
  return [...new Set(source.split(/,|;|\n|\s+y\s+/i).map(s => s.trim().replace(/[.!]+$/, "")).filter(Boolean))].slice(0, 10);
}
export function parseSetupIntent(message: string, step: SetupStep, baseline: SetupHours, industry: string): SetupProposal | null {
  const text = normalizeSetupText(message);
  if (/ignora|system prompt|sql|borra|elimina|otro negocio|api.?key|secret|<script/.test(text)) return null;
  if (step === "hours") return parseSetupHours(message, baseline);
  if (step === "business") {
    const number = text.match(/(?:con|somos|tengo)\s+(\d+|un[ao]?|dos|tres|cuatro|cinco)\s+(?:personas|profesionales)/);
    const numbers: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
    const count = number ? numbers[number[1]] ?? Number(number[1]) : null;
    const mode = /independiente|trabajo sol[oa]|atiendo sol[oa]|por mi cuenta/.test(text) ? "solo" : /equipo|centro|profesionales/.test(text) || (count && count > 1) ? "team" : null;
    const rubro = message.match(/(?:tengo|somos|soy)\s+(?:un[ao]?\s+)?(.+?)(?:\s+con\s+|\s+y\s+ofrezco|[.!]|$)/i)?.[1]?.trim() ?? industry;
    const proposal = mode ? setupProposalSchema.safeParse({ kind: "profile", mode, industry: rubro.slice(0, 120), professionalCount: count }) : null;
    return proposal?.success ? proposal.data : null;
  }
  if (step === "services") {
    const list = message.match(/(?:ofrezco|mis servicios son|servicios:\s*|prepara (?:los )?servicios|agrega (?:los )?servicios)\s+(.+)/i)?.[1];
    if (!list || /\d|precio|minutos|\$/.test(list)) return null;
    const names = uniqueNames(list); return names.length && names.every(n => n.length <= 100) ? { kind: "services", names } : null;
  }
  if (step === "staff") {
    const list = message.match(/(?:mi equipo (?:es|son)|(?:agrega|prepara) (?:a |profesionales:?\s*))\s*(.+)/i)?.[1];
    if (!list || /\d|horari|precio|limite/.test(normalizeSetupText(list))) return null;
    const names = uniqueNames(list); return names.length && names.every(n => n.length <= 100) ? { kind: "staff", names } : null;
  }
  return null;
}
