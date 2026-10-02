import type { BellaConfig } from "../../config";
import type { StudioService } from "../../booking/types";

export type BellaGalleryItem = BellaConfig["gallery"][number];

/** Resolve tenant-owned gallery content. Template demo assets are intentionally excluded. */
export function resolveBellaGallery(config: Pick<BellaConfig, "gallery">, services: Pick<StudioService, "image" | "name" | "category">[]): BellaGalleryItem[] {
  if (config.gallery.length > 0) return config.gallery;
  return services.filter((service) => service.image).slice(0, 30).map((service) => ({
    image: service.image,
    name: service.name,
    alt: `Trabajo de ${service.name}`,
    category: service.category || "Servicios",
  }));
}
