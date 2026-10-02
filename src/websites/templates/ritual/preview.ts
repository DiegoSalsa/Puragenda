import { z } from "zod";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { ritualConfigSchema } from "./config";
import { galleryImageSchema } from "../../shared-config";

/** Copy controls share section targets when their optional element is absent. */
export function ritualPreviewTarget(focus: string): string {
  if (focus.startsWith("nav.") || ["displayName", "brandEyebrow", "heroCaption", "reserve", "secondary", "heroStamp", "logo", "favicon"].includes(focus)) return "#top";
  if (["serviceAction", "servicesAll", "allServices", "serviceDefaultLabel", "servicesNote"].includes(focus)) return "#services";
  if (["staffNote", "staffDefaultLabel"].includes(focus)) return "#staff";
  if (["gallery", "galleryTitle", "galleryNote", "galleryAll"].includes(focus)) return "#gallery";
  if (focus === "about" || focus === "aboutImage") return "#about";
  if (focus.startsWith("booking") || focus === "booking") return "#booking";
  if (["phone", "whatsapp", "contactEmail", "instagram", "facebook", "socialImage", "seoTitle", "seoDescription"].includes(focus)) return '[data-website-field="contact"]';
  if (focus === "pauseAction") return '[data-website-field="pauseLabel"]';
  return `[data-website-field="${focus}"]`;
}
export function parseRitualPreview(input: unknown, origin: string) {
  const previewMedia = z.string().max(2000).refine(value => {
    if (value.startsWith("blob:")) { try { return new URL(value.slice(5)).origin === origin; } catch { return false; } }
    return ritualConfigSchema.shape.heroImage.safeParse(value).success;
  });
  const previewConfig = ritualConfigSchema.safeExtend({ logo: previewMedia, favicon: previewMedia, heroImage: previewMedia, aboutImage: previewMedia, socialImage: previewMedia, gallery: z.array(galleryImageSchema.extend({ image: previewMedia.refine(Boolean) })).max(30), contactEmail: z.string().max(320), whatsapp: z.string().max(20) });
  return z.object({ protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("draft"), sequence: z.number().int().nonnegative(), config: previewConfig, focus: z.string().regex(/^[a-zA-Z][a-zA-Z0-9.]*$/).max(80).optional() }).strict().safeParse(input);
}
