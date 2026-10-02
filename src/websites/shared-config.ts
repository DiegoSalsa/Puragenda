import { z } from "zod";
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
export const media = text(2000).refine(safeMediaUrl, "Usa una imagen local o de Cloudinary");
const categoryId = z.string().regex(/^cat-[a-z0-9-]{1,60}$/, "ID de categoría inválido");
export const galleryImageSchema = z.object({ image: media.refine(v => !!v, "Imagen requerida"), name: text(100), alt: text(250), category: text(80), filters: z.array(z.string().trim().min(1).max(80)).max(8).optional(), categoryIds: z.array(categoryId).max(8).optional(), focal: z.enum(["center", "left", "right"]).optional() }).strict();
export const galleryCategorySchema = z.object({ id: categoryId, label: z.string().trim().min(1).max(80), order: z.number().int().nonnegative().default(0) }).strict();
