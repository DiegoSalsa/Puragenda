import { z } from "zod";
import { dateKeyInTimezone } from "@/lib/date";
import { startOfLocalDay } from "@/lib/zoned-appointment-time";
export const GROWTH_RULE_VERSION = "growth-v1";
export const growthRulesSchema = z
  .object({
    periodDays: z
      .union([z.literal(7), z.literal(14), z.literal(28)])
      .default(28),
    inactivityFallbackDays: z.number().int().min(14).max(180).default(45),
    minimumFrequencyGaps: z.number().int().min(3).max(100).default(8),
    minimumClients: z.number().int().min(3).max(50).default(5),
    minimumSample: z.number().int().min(5).max(100).default(10),
    lowOccupancyPercent: z.number().min(5).max(60).default(35),
    trendDropPercent: z.number().min(10).max(80).default(20),
    suppressionDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();
export type GrowthRules = z.infer<typeof growthRulesSchema>;
export const DEFAULT_GROWTH_RULES = growthRulesSchema.parse({});
export function growthWindow(
  timezone: string,
  rules: GrowthRules,
  now = new Date(),
) {
  const endKey = dateKeyInTimezone(now, timezone);
  const shift = (days: number) => {
    const d = new Date(`${endKey}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  return {
    start: startOfLocalDay(shift(rules.periodDays), timezone),
    end: startOfLocalDay(endKey, timezone),
    previousStart: startOfLocalDay(shift(rules.periodDays * 2), timezone),
    historyStart: startOfLocalDay(shift(365), timezone),
    startKey: shift(rules.periodDays),
    endKey,
    periodDays: rules.periodDays,
    timezone,
  };
}
export type GrowthWindow = ReturnType<typeof growthWindow>;
export type GrowthSignalKind =
  | "INACTIVE_CLIENTS"
  | "LOW_OCCUPANCY"
  | "DEMAND_DECLINE"
  | "SERVICE_TREND";
export type DetectedGrowthSignal = {
  kind: GrowthSignalKind;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  priority: number;
  evidence: Record<string, unknown>;
  material: Record<string, unknown>;
  title: string;
};
export const strategySchema = z
  .object({
    version: z.literal(1),
    objective: z.enum(["RECOVERY", "FILL_AVAILABLE_TIME", "REVIEW_DEMAND"]),
    cohort: z
      .object({
        kind: z.literal("RULE_BASED_REQUERY"),
        inactiveDays: z.number().int().min(14).max(180).nullable(),
        noFutureBooking: z.literal(true),
        ruleVersion: z.literal(GROWTH_RULE_VERSION),
        rules: growthRulesSchema,
        thresholdPolicy: z.literal(
          "PERSONAL_MEDIAN_ELSE_BUSINESS_MEDIAN_ELSE_FALLBACK",
        ),
        historyDays: z.literal(365),
      })
      .strict(),
    frequency: z.literal("DAILY_GRADUAL"),
    durationDays: z.number().int().min(7).max(30),
    dailyLimit: z.number().int().min(1).max(10),
    monthlyLimit: z.number().int().min(1).max(100),
    exclusionRules: z
      .array(
        z.enum([
          "NO_VERIFIED_CONSENT",
          "SUPPRESSED",
          "FUTURE_BOOKING",
          "RECENT_CONTACT",
          "ENTITLEMENT_EXPIRED",
        ]),
      )
      .length(5),
    consent: z.literal("FRESH_VERIFIABLE_PROMOTIONAL_CONSENT_REQUIRED"),
    template: z.literal("RECOVERY_REVIEW_REQUIRED"),
    estimatedAudience: z.number().int().nonnegative(),
    guaranteedRevenue: z.null(),
    risks: z.array(z.string().max(100)).max(6),
    approvalRequired: z.literal(true),
    executable: z.literal(false),
    engine: z.literal("CONTACT_FLOW_NOT_IMPLEMENTED"),
  })
  .strict()
  .refine((s) => s.dailyLimit <= s.monthlyLimit, "Invalid quota")
  .refine(
    (s) => new Set(s.exclusionRules).size === 5,
    "All exclusions required",
  );
export type GrowthStrategy = z.infer<typeof strategySchema>;
