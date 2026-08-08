import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const dateSchema = z.string().date();

export const storyTemplateSchema = z.enum(["AURORA", "EDITORIAL", "BOLD", "MINIMAL", "FRAME"]);
export const storyObjectiveSchema = z.enum(["FILL_SLOTS", "LAST_MINUTE", "PROMOTE_SERVICE", "CANCELLATION"]);
export const storyRangeSchema = z.enum([
  "TODAY",
  "TOMORROW",
  "NEXT_7",
  "NEXT_AVAILABLE",
  "NEXT_3_AVAILABLE",
  "CUSTOM",
]);

export const availabilityStoryRequestSchema = z.object({
  serviceIds: z.array(z.string().trim().min(1)).max(30).default([]),
  allServices: z.boolean().default(false),
  locationId: z.string().trim().min(1),
  staffId: z.string().trim().min(1).nullable().optional(),
  range: storyRangeSchema,
  targetDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  excludedDates: z.array(dateSchema).max(90).default([]),
  selectedSlots: z.array(z.object({
    date: dateSchema,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).max(40).default([]),
  template: storyTemplateSchema,
  objective: storyObjectiveSchema.default("FILL_SLOTS"),
  headline: z.string().trim().min(1).max(80).default("¡Tenemos horas disponibles!"),
  backgroundMode: z.enum(["ART", "SOLID", "PHOTO"]).default("ART"),
  accentColor: colorSchema,
  secondaryColor: colorSchema,
  canvasColor: colorSchema,
  storyTextColor: colorSchema,
  artIntensity: z.number().min(0).max(1).default(0.38),
  fontStyle: z.enum(["MODERN", "ELEGANT", "BOLD"]).default("MODERN"),
  logoFit: z.enum(["CONTAIN", "COVER"]).default("CONTAIN"),
  showLogo: z.boolean().default(true),
  showServices: z.boolean().default(true),
  showSchedule: z.boolean().default(true),
  showProfessional: z.boolean().default(true),
  showLocationName: z.boolean().default(true),
  showAddress: z.boolean().default(false),
  ctaMode: z.enum(["LINK_STICKER", "BIO"]).default("LINK_STICKER"),
  callToAction: z.string().trim().min(1).max(90).optional(),
}).superRefine((value, context) => {
  if (!value.allServices && value.serviceIds.length === 0) {
    context.addIssue({ code: "custom", message: "Selecciona al menos un servicio", path: ["serviceIds"] });
  }
  if (value.range === "CUSTOM" && (!value.targetDate || !value.endDate)) {
    context.addIssue({ code: "custom", message: "Selecciona el inicio y fin del período", path: ["targetDate"] });
  }
  if (value.targetDate && value.endDate && value.endDate < value.targetDate) {
    context.addIssue({ code: "custom", message: "La fecha final debe ser posterior a la inicial", path: ["endDate"] });
  }
});

export const storyPresetCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  configuration: availabilityStoryRequestSchema,
  isDefault: z.boolean().default(false),
});

export const storyActivitySchema = z.object({
  activity: z.enum(["download", "share", "copy", "archive"]),
});

export type AvailabilityStoryRequest = z.infer<typeof availabilityStoryRequestSchema>;
export type StoryTemplate = z.infer<typeof storyTemplateSchema>;
export type StoryObjective = z.infer<typeof storyObjectiveSchema>;
