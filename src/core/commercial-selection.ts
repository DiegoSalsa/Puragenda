import { z } from "zod";
import { COMMERCIAL_MAX_PROFESSIONALS } from "./commercial-catalog";
export const commercialSelectionSchema = z.object({
  plan: z.enum(["PURAGENDA", "PURAGENDA_PLUS"]),
  professionalTotal: z.number().int().min(1).max(COMMERCIAL_MAX_PROFESSIONALS),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
}).strict();
export type CommercialSelection = z.infer<typeof commercialSelectionSchema>;
