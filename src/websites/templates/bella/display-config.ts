import type { BellaConfig } from "./config";
import type { StudioService } from "../../booking/types";
import { resolveBellaGallery } from "./gallery";
import { editableProcess } from "./process";

export function bellaDisplayConfig(config: BellaConfig, services: Pick<StudioService, "image" | "name" | "category">[], preview: boolean): BellaConfig {
  const gallery = resolveBellaGallery(config, services);
  return {
    ...config,
    heroImage: config.heroImage || services.find(service => service.image)?.image || "",
    gallery: preview && !gallery.length ? Array.from({ length: 3 }, (_, index) => ({ image: "", name: `Tu trabajo ${index + 1}`, alt: `Añade la foto ${index + 1} en Galería`, category: "" })) : gallery,
    process: preview ? editableProcess(config.process) : config.process.filter(moment => moment.image),
  };
}
