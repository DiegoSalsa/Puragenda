import type { RitualConfig } from "./config";
import type { Catalog } from "../../booking/types";
import { categoryId } from "../../gallery-categories";
export function ritualGallery(config: Pick<RitualConfig, "gallery">, catalog: Catalog): RitualConfig["gallery"] {
  if (config.gallery.length) return config.gallery;
  const images: RitualConfig["gallery"] = [];
  for (const service of catalog.services) {
    if (!service.image) continue;
    const id = service.categoryId || (service.category ? categoryId(service.category) : "");
    const existing = images.find(image => image.image === service.image);
    if (existing) { if (id && !existing.categoryIds?.includes(id)) existing.categoryIds = [...(existing.categoryIds ?? []), id]; continue; }
    images.push({ image: service.image, name: service.name, alt: service.name, category: service.category, categoryIds: id ? [id] : [], focal: "center" });
  }
  return images;
}
/** Service categories are a runtime projection, never written into manual gallery config. */
export function ritualGalleryCategories(config: Pick<RitualConfig, "gallery" | "galleryCategories">, catalog: Catalog) {
  if (config.gallery.length) return config.galleryCategories;
  const rows = new Map<string, RitualConfig["galleryCategories"][number]>();
  for (const service of catalog.services) {
    const id = service.categoryId || (service.category ? categoryId(service.category) : "");
    if (service.image && id && service.category && !rows.has(id)) rows.set(id, { id, label: service.category, order: rows.size });
  }
  return [...rows.values()];
}
export function ritualGalleryWindow<T>(items: T[], cursor: number, size = 6) {
  if (!items.length) return { items: [] as T[], cursor: 0, total: 0 };
  const total = items.length, safe = ((cursor % total) + total) % total;
  return { items: Array.from({ length: Math.min(size, total) }, (_, i) => items[(safe + i) % total]), cursor: safe, total };
}
export function ritualServiceLimit(count: number) { return count <= 8 ? count : 6; }
export function ritualVisibleServices<T>(items: T[], limit: number) { return items.slice(0, Math.max(ritualServiceLimit(items.length), limit)); }
