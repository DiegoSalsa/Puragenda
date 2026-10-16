import { z } from "zod";
import { media } from "../../shared-config";
import { PREVIEW_PROTOCOL } from "../../preview-transport";
import { REFERENCE_STICKERS, STICKER_CATEGORIES } from "./reference-stickers";

// Keep saved kinds readable while replacing the original generic drawings.
const LEGACY_STICKER_KINDS = ["chrome-heart", "chrome-star", "pink-bow", "butterfly", "cherries", "planet", "sparkles", "crown", "lipstick", "flower", "angel-wings", "love-note"] as const;
export const STICKER_KINDS = [...LEGACY_STICKER_KINDS, ...REFERENCE_STICKERS.map(art => art.kind), "custom"] as const;
export const STICKER_LIBRARY = REFERENCE_STICKERS;
export { STICKER_CATEGORIES };
const legacyArt = { cherries: "double-pink-hearts", lipstick: "pink-phone", flower: "floral-cross", "angel-wings": "butterfly" } as const;
export function stickerArt(kind: typeof STICKER_KINDS[number]) {
  const resolved = kind in legacyArt ? legacyArt[kind as keyof typeof legacyArt] : kind;
  return STICKER_LIBRARY.find(art => art.kind === resolved);
}
export const STICKER_REGIONS = ["header", "hero", "ribbon", "services", "gallery", "guide", "final", "footer"] as const;
export const STICKER_REGION_NAMES: Record<typeof STICKER_REGIONS[number], string> = {
  header: "Encabezado", hero: "Portada", ribbon: "Cinta", services: "Servicios", gallery: "Galería", guide: "Mi negocio", final: "Cierre", footer: "Contacto",
};
export const MAX_STICKERS = 40;
export const stickerPlacementSchema = z.object({
  region: z.enum(STICKER_REGIONS).default("hero"),
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(35),
  size: z.number().min(24).max(280).default(100),
  rotation: z.number().min(-180).max(180).default(0),
  // Missing visibility/order keeps existing saved compositions unchanged.
  visible: z.boolean().optional(),
  layer: z.number().int().min(0).max(MAX_STICKERS - 1).optional(),
}).strict();
export const stickerSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  kind: z.enum(STICKER_KINDS),
  image: media,
  desktop: stickerPlacementSchema.prefault({}),
  mobile: stickerPlacementSchema.prefault({ size: 72 }),
}).strict().refine(item => item.kind !== "custom" || Boolean(item.image), { message: "Sube una imagen para tu sticker", path: ["image"] });
export const stickersSchema = z.array(stickerSchema).max(MAX_STICKERS * 2).default([])
  .refine(items => new Set(items.map(item => item.id)).size === items.length, "Cada sticker necesita un identificador único")
  .refine(items => (["desktop", "mobile"] as const).every(viewport => items.filter(item => item[viewport].visible !== false).length <= MAX_STICKERS), `Puedes añadir hasta ${MAX_STICKERS} stickers por vista`);
export type PinkSticker = z.infer<typeof stickerSchema>;
export type StickerPlacement = z.infer<typeof stickerPlacementSchema>;
export type StickerViewport = "desktop" | "mobile";
export type StickerEditorState = { enabled: boolean; selectedId?: string; viewport: StickerViewport };
export const stickerEditorSchema = z.object({ enabled: z.boolean(), selectedId: stickerSchema.shape.id.optional(), viewport: z.enum(["desktop", "mobile"]) }).strict();
export const stickerEditMessageSchema = z.object({
  protocol: z.literal(PREVIEW_PROTOCOL), type: z.literal("sticker-edit"),
  id: stickerSchema.shape.id, viewport: z.enum(["desktop", "mobile"]),
  action: z.enum(["select", "move", "delete"]), placement: stickerPlacementSchema.optional(),
}).strict().refine(item => item.action !== "move" || item.placement !== undefined);
export type StickerEdit = Omit<z.infer<typeof stickerEditMessageSchema>, "protocol" | "type">;
export const stickerName = (item: Pick<PinkSticker, "kind">) => item.kind === "custom" ? "Mi sticker" : stickerArt(item.kind)?.name ?? "Sticker";
export const newSticker = (kind: PinkSticker["kind"], id: string, image = "", viewport: StickerViewport = "desktop"): PinkSticker => stickerSchema.parse({
  id, kind, image, desktop: { visible: viewport === "desktop" }, mobile: { size: 72, visible: viewport === "mobile" },
});
export function stickersForViewport(items: PinkSticker[], viewport: StickerViewport) {
  return items.map((item, index) => ({ item, order: item[viewport].layer ?? index }))
    .filter(({ item }) => item[viewport].visible !== false)
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}
export function duplicateSticker(item: PinkSticker, id: string, viewport: StickerViewport): PinkSticker {
  const placement = item[viewport];
  return {
    ...newSticker(item.kind, id, item.image, viewport),
    [viewport]: { ...placement, visible: true, layer: undefined, x: Math.min(100, placement.x + 5), y: Math.min(100, placement.y + 5) },
  };
}
export function layerSticker(items: PinkSticker[], id: string, viewport: StickerViewport, front: boolean) {
  const visible = stickersForViewport(items, viewport), selected = visible.find(item => item.id === id);
  if (!selected) return items;
  const rest = visible.filter(item => item.id !== id);
  const order = new Map((front ? [...rest, selected] : [selected, ...rest]).map((item, index) => [item.id, index]));
  return items.map(item => order.has(item.id) ? { ...item, [viewport]: { ...item[viewport], layer: order.get(item.id)! } } : item);
}
export function applyStickerEdit(items: PinkSticker[], edit: StickerEdit) {
  if (edit.action === "delete") return items
    .map(item => item.id === edit.id ? { ...item, [edit.viewport]: { ...item[edit.viewport], visible: false } } : item)
    .filter(item => item.desktop.visible !== false || item.mobile.visible !== false);
  if (edit.action !== "move" || !edit.placement) return items;
  return items.map(item => item.id === edit.id && item[edit.viewport].visible !== false ? {
    ...item, [edit.viewport]: { ...edit.placement, visible: item[edit.viewport].visible, layer: item[edit.viewport].layer },
  } : item);
}
export type StickerRegionBox = { region: StickerPlacement["region"]; top: number; height: number };
export function placementAtPoint(placement: StickerPlacement, x: number, y: number, width: number, regions: StickerRegionBox[]): StickerPlacement {
  const region = regions.find(box => y >= box.top && y <= box.top + box.height) ?? regions.reduce<StickerRegionBox | undefined>((nearest, box) => {
    const distance = Math.max(box.top - y, y - box.top - box.height, 0);
    const previous = nearest ? Math.max(nearest.top - y, y - nearest.top - nearest.height, 0) : Infinity;
    return distance < previous ? box : nearest;
  }, undefined);
  const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
  return { ...placement, x: clamp(x / Math.max(width, 1) * 100), ...(region ? { region: region.region, y: clamp((y - region.top) / Math.max(region.height, 1) * 100) } : {}) };
}
