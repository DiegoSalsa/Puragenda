import { z } from "zod";
import { bellaConfigSchema, galleryImageSchema } from "./config";
export const PREVIEW_PROTOCOL = "puragenda.website.v2";
export const previewFields = ["brandEyebrow", "brandTitle", "displayName", "headline", "intro", "heroImage", "heroCaption", "logo", "gallery", "galleryTitle", "gallerySubtitle", "about", "aboutImage", "studioTitle", "servicesTitle", "booking", "contact", "accent"] as const;
export type PreviewField = typeof previewFields[number];
export function trustedPreviewSender(event: Pick<MessageEvent, "origin" | "source">, parent: MessageEventSource, origin: string) { return event.origin === origin && event.source === parent; }
export function parsePreviewMessage(data: unknown, origin: string) {
  const visualMedia = z.string().max(2000).refine(value => {
    if (value.startsWith("blob:")) { try { return new URL(value.slice(5)).origin === origin; } catch { return false; } }
    return bellaConfigSchema.shape.heroImage.safeParse(value).success;
  });
  const config = bellaConfigSchema.safeExtend({ logo: visualMedia, favicon: visualMedia, heroImage: visualMedia, aboutImage: visualMedia, socialImage: visualMedia, gallery: z.array(galleryImageSchema.extend({ image: visualMedia })).max(30), process: z.array(bellaConfigSchema.shape.process.unwrap().element.extend({ image: visualMedia })).max(6), contactEmail: z.string().max(320), whatsapp: z.string().max(20) });
  return z.object({ protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("draft"), sequence: z.number().int().nonnegative(), config, focus: z.enum(previewFields).optional(), galleryFilter: z.string().max(80).optional() }).strict().safeParse(data);
}
