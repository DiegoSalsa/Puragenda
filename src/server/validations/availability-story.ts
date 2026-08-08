import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const availabilityStoryRequestSchema = z.object({
  serviceIds: z.array(z.string().trim().min(1)).max(30).default([]),
  allServices: z.boolean().default(false),
  locationId: z.string().trim().min(1),
  staffId: z.string().trim().min(1).nullable().optional(),
  range: z.enum(["TODAY", "TOMORROW", "NEXT_7"]),
  template: z.enum(["AURORA", "EDITORIAL", "BOLD"]),
  headline: z.string().trim().min(1).max(80).default("¡Tenemos horas disponibles!"),
  backgroundMode: z.enum(["ART", "SOLID"]).default("ART"),
  accentColor: colorSchema,
  secondaryColor: colorSchema,
  canvasColor: colorSchema,
  storyTextColor: colorSchema,
  showLogo: z.boolean().default(true),
  showServices: z.boolean().default(true),
  callToAction: z.string().trim().min(1).max(90).optional(),
}).refine((value) => value.allServices || value.serviceIds.length > 0, {
  message: "Selecciona al menos un servicio",
  path: ["serviceIds"],
});

export type AvailabilityStoryRequest = z.infer<typeof availabilityStoryRequestSchema>;
