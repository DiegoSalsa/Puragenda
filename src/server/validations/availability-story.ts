import { z } from "zod";

export const availabilityStoryRequestSchema = z.object({
  serviceId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  staffId: z.string().trim().min(1).nullable().optional(),
  range: z.enum(["TODAY", "TOMORROW", "NEXT_7"]),
  template: z.enum(["GRADIENT", "MINIMAL"]),
  headline: z.string().trim().min(1).max(80).default("¡Tenemos horas disponibles!"),
});

export type AvailabilityStoryRequest = z.infer<typeof availabilityStoryRequestSchema>;
