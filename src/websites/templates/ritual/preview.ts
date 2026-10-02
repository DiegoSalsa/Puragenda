import { z } from "zod";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { ritualConfigSchema } from "./config";
const previewMedia = z.string().max(2000).refine(value => value === "" || value.startsWith("blob:") || ritualConfigSchema.shape.heroImage.safeParse(value).success);
const previewConfig = ritualConfigSchema.safeExtend({ logo: previewMedia, favicon: previewMedia, heroImage: previewMedia, aboutImage: previewMedia, socialImage: previewMedia, contactEmail: z.string().max(320), whatsapp: z.string().max(20) });
export function parseRitualPreview(input: unknown) { return z.object({ protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("draft"), sequence: z.number().int().nonnegative(), config: previewConfig, focus: z.string().optional() }).strict().safeParse(input); }
