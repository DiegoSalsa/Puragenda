import { z } from "zod";
import { pinkConfigSchema } from "./config";
import { galleryImageSchema } from "../../shared-config";
import { PREVIEW_PROTOCOL } from "../../preview-transport";

export function parsePinkPreview(data: unknown, origin: string) {
  const media = z.string().max(2000).refine(value => {
    if (value.startsWith("blob:")) { try { return new URL(value.slice(5)).origin === origin; } catch { return false; } }
    return pinkConfigSchema.shape.heroImage.safeParse(value).success;
  });
  const config = pinkConfigSchema.safeExtend({ heroImage: media, aboutImage: media, logo: media, favicon: media, socialImage: media, gallery: z.array(galleryImageSchema.extend({ image: media })).max(30), contactEmail: z.string().max(320), whatsapp: z.string().max(20) });
  return z.object({ protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("draft"), sequence: z.number().int().nonnegative(), config, focus: z.string().regex(/^[a-zA-Z]+$/).max(80).optional() }).strict().safeParse(data);
}
export function pinkPreviewTarget(field: string) {
  return ({ gallery: "#gallery", about: "#guide", contact: "#pink-contact", logo: "#top", heroImage: "#pink-heading", headline: "#pink-heading", intro: "#pink-heading" } as Record<string, string>)[field] ?? "#top";
}
