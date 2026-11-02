import { z } from "zod";
import type { DashboardPermission } from "./permissions";

export const SETUP_VERSION = 2;
export const SETUP_STEPS = ["business", "hours", "staff", "services", "check"] as const;
export type SetupStep = typeof SETUP_STEPS[number];
export const SETUP_LABELS: Record<SetupStep, string> = { business: "Tu negocio", hours: "Horarios", staff: "Profesionales", services: "Servicios", check: "Comprobar agenda" };
export const setupStepSchema = z.enum(SETUP_STEPS);
export function canManageSetup(permissions: readonly DashboardPermission[]) {
  return (["settings.manage", "staff.manage", "services.manage"] as DashboardPermission[]).every(p => permissions.includes(p));
}
export const hourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  breakStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(), breakEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
}).superRefine((h, ctx) => {
  if (!h.isOpen) return;
  if (h.startTime >= h.endTime) ctx.addIssue({ code: "custom", message: "La apertura debe ser anterior al cierre." });
  if ((h.breakStart || h.breakEnd) && (!h.breakStart || !h.breakEnd || h.breakStart >= h.breakEnd || h.breakStart < h.startTime || h.breakEnd > h.endTime)) ctx.addIssue({ code: "custom", message: "La pausa debe estar dentro del horario de atención." });
});
export const hoursSchema = z.array(hourSchema).length(7).refine(h => new Set(h.map(d => d.dayOfWeek)).size === 7, "Revisa los siete días de la semana.");
export type SetupHours = z.infer<typeof hoursSchema>;
export const defaultSetupHours = (): SetupHours => Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: dayOfWeek > 0 && dayOfWeek < 6, startTime: "09:00", endTime: "18:00", breakStart: null, breakEnd: null }));

export type SetupFacts = { mode: string | null; hours: boolean; staff: boolean; services: boolean; businessOnly: boolean; verified: boolean };
export function setupProgress(facts: SetupFacts) {
  const steps = SETUP_STEPS.filter(s => s !== "staff" || facts.mode === "team" || !facts.staff);
  const done: Record<SetupStep, boolean> = { business: !!facts.mode, hours: facts.hours, staff: facts.staff || facts.businessOnly, services: facts.services, check: facts.verified };
  const completed = steps.filter(s => done[s]);
  return { steps, completed, next: steps.find(s => !done[s]) ?? "check", percent: Math.round(100 * completed.length / steps.length) };
}
export function setupTransition(current: SetupStep, direction: "back" | "next", facts: SetupFacts): SetupStep {
  const { steps } = setupProgress(facts);
  const index = Math.max(0, steps.indexOf(current));
  return steps[Math.max(0, Math.min(steps.length - 1, index + (direction === "next" ? 1 : -1)))];
}
export type ActivationState = "incomplete" | "unshared" | "no_bookings" | "first_booking" | "habitual";
export function activationState(ready: boolean, shared: boolean, bookings: number): ActivationState {
  if (!ready) return "incomplete";
  if (!shared) return "unshared";
  return bookings === 0 ? "no_bookings" : bookings === 1 ? "first_booking" : "habitual";
}
