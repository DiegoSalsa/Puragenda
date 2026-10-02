import type { RitualConfig } from "./config";
import type { Catalog } from "../../booking/types";
export function ritualGallery(config: Pick<RitualConfig, "gallery">, catalog: Catalog): RitualConfig["gallery"] {
  if (config.gallery.length) return config.gallery;
  const seen = new Set<string>();
  return catalog.services.filter(service => service.image && !seen.has(service.image) && !!seen.add(service.image)).map(service => ({ image: service.image, name: service.name, alt: service.name, category: service.category, categoryIds: [] as string[], focal: "center" as const }));
}
export function ritualGalleryWindow<T>(items: T[], cursor: number, size = 6) {
  if (!items.length) return { items: [] as T[], cursor: 0, total: 0 };
  const total = items.length, safe = ((cursor % total) + total) % total;
  return { items: Array.from({ length: Math.min(size, total) }, (_, i) => items[(safe + i) % total]), cursor: safe, total };
}
export function ritualServiceLimit(count: number) { return count <= 8 ? count : 6; }
