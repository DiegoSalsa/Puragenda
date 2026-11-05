import {z} from "zod";
import {COMMERCIAL_CATALOG_VERSION, quoteCommercialContract} from "./commercial-catalog";

export const legacyPlusTermsSchema = z.object({
  origin: z.literal("legacy_plus_upgrade"), baseSubscriptionId: z.string(),
  basePlan: z.enum(["INDIVIDUAL", "EQUIPO", "TEST"]),
  upgradeCycleAmount: z.number().int().positive(), baseCycleAmount: z.number().int().nonnegative(),
  combinedRecurring: z.boolean(), providerSubscriptionId: z.string().nullable(),
  cancelAt: z.string().datetime().nullable(), acceptedBy: z.string(), acceptedAt: z.string().datetime(),
});
export type LegacyPlusTerms = z.infer<typeof legacyPlusTermsSchema>;
export function legacyPlusTerms(value: unknown) { return legacyPlusTermsSchema.safeParse(value).data ?? null; }
export function plusUpgradeCycleAmount(professionalTotal: number, billingCycle: "MONTHLY" | "ANNUAL") {
  const selection = {professionalTotal, billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION};
  return quoteCommercialContract({...selection, plan: "PURAGENDA_PLUS"}).cycleTotal - quoteCommercialContract({...selection, plan: "PURAGENDA"}).cycleTotal;
}
export function remainingPlusAmount(amount: number, from: Date, through: Date, now: Date) {
  if (!(from <= now && now < through)) throw new Error("LEGACY_PLUS_PERIOD_INVALID");
  return Math.max(1, Math.ceil(amount * (+through - +now) / (+through - +from)));
}
