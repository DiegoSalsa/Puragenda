import { z } from "zod";
import { websiteAssetSchema } from "./media";

// Website media uses the same local/Cloudinary delivery as the rest of Puragenda.
export function safeMediaUrl(value: string) {
  if (!value) return true;
  if (/^\/(?!\/)[a-zA-Z0-9/_.,% -]+$/.test(value)) {
    try {
      const decoded = decodeURIComponent(value);
      if (!decoded.includes("..") && !/[\\\x00-\x1f]/.test(decoded) && !decoded.startsWith("//")) return true;
    } catch { return false; }
  }
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password; } catch { return false; }
}
export function safeLink(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
const text = (max: number) => z.string().trim().max(max).default("");
const media = text(2000).refine(safeMediaUrl, "Usa una imagen local o de Cloudinary");
export const galleryImageSchema = z.object({ image: media.refine(v => !!v, "Imagen requerida"), name: text(100), alt: text(250), category: text(80), filters: z.array(z.string().trim().min(1).max(80)).max(8).optional(), focal: z.enum(["center", "left", "right"]).optional() }).strict();
export const bellaConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  displayName: text(160), brandEyebrow: text(80), brandTitle: text(160),
  logo: media, favicon: media, heroImage: media, heroCaption: text(180),
  headline: text(200), intro: text(600), about: text(3000), aboutImage: media,
  gallery: z.array(galleryImageSchema).max(30).default([]),
  galleryFilters: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  process: z.array(galleryImageSchema.extend({ title: text(80) }).strict()).max(6).default([]),
  accent: z.enum(["coral", "plum", "forest"]).default("coral"),
  contactEmail: z.union([z.literal(""), z.email()]).default(""), phone: text(30),
  whatsapp: text(20).refine(v => !v || /^\+?\d{8,15}$/.test(v), "WhatsApp inválido"),
  instagram: text(2000).refine(safeLink), facebook: text(2000).refine(safeLink),
  seoTitle: text(160), seoDescription: text(300), socialImage: media,
  mediaAssets: z.array(websiteAssetSchema).max(100).optional(),
}).strict();
export type BellaConfig = z.infer<typeof bellaConfigSchema>;
export const emptyBellaConfig = () => bellaConfigSchema.parse({});
