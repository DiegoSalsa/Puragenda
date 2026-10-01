import type { MatchdayConfig } from "./config";
import type { Catalog } from "../../booking/types";
export function matchdayGallery(config: Pick<MatchdayConfig, "gallery">, catalog: Catalog) {
  if (config.gallery.length) return config.gallery;
  const seen = new Set<string>();
  return catalog.services.filter(service => service.image && !seen.has(service.image) && !!seen.add(service.image)).map(service => ({ image: service.image, name: service.name, alt: service.name, category: service.category, categoryIds: [] as string[], focal: "center" as const }));
}
