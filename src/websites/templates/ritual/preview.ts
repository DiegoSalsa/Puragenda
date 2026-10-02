import { z } from "zod";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { ritualConfigSchema } from "./config";
import { galleryImageSchema } from "../../shared-config";
export function parseRitualPreview(input: unknown, origin: string) {
  const previewMedia = z.string().max(2000).refine(value => {
    if (value.startsWith("blob:")) { try { return new URL(value.slice(5)).origin === origin; } catch { return false; } }
    return ritualConfigSchema.shape.heroImage.safeParse(value).success;
  });
  const previewConfig = ritualConfigSchema.safeExtend({ logo: previewMedia, favicon: previewMedia, heroImage: previewMedia, aboutImage: previewMedia, socialImage: previewMedia, gallery: z.array(galleryImageSchema.extend({ image: previewMedia.refine(Boolean) })).max(30), contactEmail: z.string().max(320), whatsapp: z.string().max(20) });
  return z.object({ protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("draft"), sequence: z.number().int().nonnegative(), config: previewConfig, focus: z.string().regex(/^[a-zA-Z]+$/).max(80).optional() }).strict().safeParse(input);
}
