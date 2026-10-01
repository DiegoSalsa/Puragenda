import type { WebsiteView } from "./types";
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
function truncate(text: string, limit: number) { const value = clean(text); return value.length <= limit ? value : value.slice(0, limit - 1).replace(/\s+\S*$/, "") + "…"; }
export function websiteMetadata(view: WebsiteView<{ displayName: string; seoTitle: string; seoDescription: string; intro: string; socialImage: string; heroImage: string }>) {
  const { config, business, catalog } = view;
  const name = clean(config.displayName || business.name);
  const services = [...new Set(catalog.services.map(service => clean(service.name)).filter(Boolean))].slice(0, 2);
  const categories = [...new Set(catalog.services.map(service => clean(service.category)).filter(Boolean))].slice(0, 2);
  // Do not infer a city from an arbitrary address or fabricate a specialty.
  const specialty = categories.length ? categories : services;
  const title = config.seoTitle || truncate(`${name}${specialty.length ? ` | ${specialty.join(" y ")}` : ""}`, 80);
  const intro = config.intro || `${name}${services.length ? `: ${services.join(" y ")}` : ""}. Consulta los servicios y reserva tu próximo momento.`;
  const description = config.seoDescription || truncate(`${intro}${business.address ? ` Encuéntranos en ${business.address}.` : ""}`, 170);
  return { title, description, image: config.socialImage || config.heroImage };
}
