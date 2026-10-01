import { z } from "zod";
import { websiteAssetSchema } from "../../media";
import { bellaCopySchema, defaultBellaCopy } from "./copy";

import { safeLink, media, galleryImageSchema, galleryCategorySchema } from "../../shared-config";
export { safeMediaUrl, safeLink, galleryImageSchema, galleryCategorySchema } from "../../shared-config";
const text = (max: number) => z.string().trim().max(max).default("");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido");
export const customPaletteSchema = z.object({ primary: hex, text: hex, background: hex, ink: hex }).strict();
export const bellaConfigBaseSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]).default(2),
  displayName: text(160), brandEyebrow: text(80), brandTitle: text(160),
  logo: media, favicon: media, heroImage: media, heroCaption: text(180),
  headline: text(200), intro: text(600), about: text(3000), aboutImage: media,
  gallery: z.array(galleryImageSchema).max(30).default([]),
  galleryFilters: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  galleryCategories: z.array(galleryCategorySchema).max(20).default([]),
  copy: bellaCopySchema.default(defaultBellaCopy()),
  process: z.array(galleryImageSchema.extend({ image: media, title: text(80) }).strict()).max(6).default([]),
  accent: z.enum(["coral", "plum", "forest"]).default("coral"),
  paletteMode: z.enum(["preset", "custom"]).default("preset"), customPalette: customPaletteSchema.optional(),
  contactEmail: z.union([z.literal(""), z.email()]).default(""), phone: text(30),
  whatsapp: text(20).refine(v => !v || /^\+?\d{8,15}$/.test(v), "WhatsApp inválido"),
  instagram: text(2000).refine(safeLink), facebook: text(2000).refine(safeLink),
  seoTitle: text(160), seoDescription: text(300), socialImage: media,
  mediaAssets: z.array(websiteAssetSchema).max(100).optional(),
}).strict();
export const bellaConfigSchema = bellaConfigBaseSchema.superRefine((config, ctx) => {
  const ids = new Set<string>();
  const labels = new Set<string>();
  const orders = new Set<number>();
  for (const [index, category] of config.galleryCategories.entries()) {
    if (ids.has(category.id)) ctx.addIssue({ code: "custom", path: ["galleryCategories", index, "id"], message: "ID de categoría repetido" });
    if (labels.has(category.label.toLocaleLowerCase())) ctx.addIssue({ code: "custom", path: ["galleryCategories", index, "label"], message: "El nombre de categoría ya existe" });
    if (orders.has(category.order)) ctx.addIssue({ code: "custom", path: ["galleryCategories", index, "order"], message: "Orden de categoría repetido" });
    if (category.order >= config.galleryCategories.length) ctx.addIssue({ code: "custom", path: ["galleryCategories", index, "order"], message: "Orden de categoría inválido" });
    ids.add(category.id); labels.add(category.label.toLocaleLowerCase()); orders.add(category.order);
  }
  for (const [index, image] of config.gallery.entries()) for (const id of image.categoryIds ?? []) {
    if (!ids.has(id)) ctx.addIssue({ code: "custom", path: ["gallery", index, "categoryIds"], message: "La categoría de la imagen no existe" });
  }
  for (const [index, image] of config.process.entries()) for (const id of image.categoryIds ?? []) {
    if (!ids.has(id)) ctx.addIssue({ code: "custom", path: ["process", index, "categoryIds"], message: "La categoría de la imagen no existe" });
  }
});
export type BellaConfig = z.infer<typeof bellaConfigSchema>;
export const emptyBellaConfig = () => bellaConfigSchema.parse({});
