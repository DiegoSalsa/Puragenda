import type { MatchdayConfig } from "./config";
import type { Catalog } from "../../booking/types";
export function matchdayGallery(config: Pick<MatchdayConfig, "gallery">, catalog: Catalog, preview = false): MatchdayConfig["gallery"] {
  if (config.gallery.length) return config.gallery;
  const seen = new Set<string>();
  const photos = catalog.services.filter(service => service.image && !seen.has(service.image) && !!seen.add(service.image)).map(service => ({ image: service.image, name: service.name, alt: service.name, category: service.category, categoryIds: [] as string[], focal: "center" as const }));
  return preview && !photos.length ? Array.from({ length: 3 }, (_, index) => ({ image: "", name: `Tu trabajo ${index + 1}`, alt: `Añade la foto ${index + 1} en Galería`, category: "" })) : photos;
}
