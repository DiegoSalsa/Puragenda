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

export function websiteStructuredData(view: WebsiteView<{ displayName: string; seoTitle: string; seoDescription: string; intro: string; socialImage: string; heroImage: string; phone: string; contactEmail: string; logo: string }>, url: string) {
  const metadata = websiteMetadata(view);
  return {
    "@context": "https://schema.org", "@type": "LocalBusiness", "@id": `${url}#business`, url,
    name: clean(view.config.displayName || view.business.name), description: metadata.description,
    ...(view.business.address ? { address: view.business.address } : {}),
    ...(view.config.phone ? { telephone: view.config.phone } : {}),
    ...(view.config.contactEmail ? { email: view.config.contactEmail } : {}),
    ...(metadata.image ? { image: new URL(metadata.image, url).toString() } : {}),
    ...(view.config.logo || view.business.logo ? { logo: new URL(view.config.logo || view.business.logo!, url).toString() } : {}),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Servicios", itemListElement: view.catalog.services.map(service => ({ "@type": "Offer", price: service.price, priceCurrency: view.catalog.business.currency, itemOffered: { "@type": "Service", name: service.name, ...(service.description ? { description: service.description } : {}) } })) },
  };
}
export function serializeWebsiteStructuredData(value: unknown) {
  // Public editable text must never break out of the JSON-LD script element.
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
