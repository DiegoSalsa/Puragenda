import { bellaConfigSchema } from "../config";
import type { WebsiteView } from "../types";
import { demoCatalog } from "./catalog";
import { works, filters } from "./portfolio";
const image = (file: string) => `/websites/bella/${file}.webp`;
export function fixtureView(tenant: "a" | "b"): WebsiteView {
  const view: WebsiteView = {
    business: { id: "fixture-a", name: "Estética Bella", logo: null, address: null, mapsUrl: null },
    preview: true, catalog: structuredClone(demoCatalog),
    config: bellaConfigSchema.parse({ brandEyebrow: "Estética", brandTitle: "Bella", heroImage: image("hero/red-chrome"), heroCaption: "Primer plano / Color rojo.", headline: "El detalle\nlo cambia\ntodo", intro: "Manicure, cejas y pestañas.", about: "Preparar. Dar forma. Terminar.\nUna mesa lista. Herramientas preparadas.\nUn acabado que se mira de cerca.", aboutImage: image("studio/space"),
      gallery: works.map(work => ({ image: work.image, name: work.name, alt: work.alt, category: work.category, filters: [...work.filters].filter(item => item !== "Todo"), focal: work.id === "red" ? "right" : "center" })), galleryFilters: filters.filter(item => item !== "Todo"),
      process: [{ image: image("studio/space"), title: "Preparar", name: "La mesa, antes del color.", alt: "Mesa preparada" }, { image: image("studio/process"), title: "Dar forma", name: "Un gesto a la vez.", alt: "Proceso de manicure" }, { image: image("hero/red-chrome"), title: "Terminar", name: "El acabado, de cerca.", alt: "Acabado" }],
    }),
  };
  if (tenant === "b") {
    view.business = { ...view.business, id: "fixture-b", name: "Aura Beauty Atelier" };
    view.config = { ...view.config, brandEyebrow: "Aura", brandTitle: "Beauty Atelier", accent: "plum", heroImage: image("services/lashes"), heroCaption: "La mirada, de cerca.", headline: "Tu mirada\ntu expresión", intro: "Diseño de cejas y pestañas.", about: "Un espacio para cuidar tu expresión.", gallery: [{ image: image("services/brows"), name: "Diseño de cejas", alt: "Detalle de cejas", category: "Cejas" }, { image: image("services/lashes"), name: "Mirada", alt: "Detalle de pestañas", category: "Pestañas" }], process: [], aboutImage: image("portfolio/chrome") };
    view.catalog.business.name = view.business.name;
    view.catalog.locations = [{ id: "aura-location", name: "Aura Atelier", timezone: "America/Santiago" }];
    view.catalog.services = [{ id: "aura-cejas", name: "Diseño personalizado de cejas", duration: 45, price: 19500, description: "Diseño que acompaña tu expresión.", category: "Mirada", categoryId: "mirada", categoryPosition: 0, image: image("services/brows"), optionCategories: [], locationIds: ["aura-location"] }, { id: "aura-lashes", name: "Lifting premium", duration: 75, price: 32500, description: "Curva natural y definición.", category: "Mirada", categoryId: "mirada", categoryPosition: 0, image: image("services/lashes"), optionCategories: [], locationIds: ["aura-location"] }];
    view.catalog.staff = [{ id: "aura-valentina", name: "Valentina", image: null, serviceIds: ["aura-cejas", "aura-lashes"], locationIds: ["aura-location"] }];
  }
  return view;
}
