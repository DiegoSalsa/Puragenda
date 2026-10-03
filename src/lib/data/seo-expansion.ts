/** Explicit editorial registry: only reviewed pages belong to a batch. No URL generation. */
export const SEO_EXPANSION_BATCH = "seo-expansion-2026-10-b01";
export type SeoCluster = "feature" | "guide" | "alternative";
export type ContentLink = { href: string; label: string; description?: string };
export type ContentSource = { label: string; url: string; consultedAt: string };
export type ContentSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export const seoExpansionPages = [
  { path: "/funciones/recordatorios-citas-email", id: "recordatorios-citas-email", cluster: "feature", intent: "recordatorios-email" },
  { path: "/funciones/reservas-sin-cuenta", id: "reservas-sin-cuenta", cluster: "feature", intent: "reserva-sin-registro" },
  { path: "/funciones/widget-reservas-web", id: "widget-reservas-web", cluster: "feature", intent: "widget-embebible" },
  { path: "/funciones/agenda-multiples-sucursales", id: "agenda-multiples-sucursales", cluster: "feature", intent: "agenda-sucursales" },
  { path: "/funciones/gift-cards", id: "gift-cards", cluster: "feature", intent: "venta-canje-gift-cards" },
  { path: "/guias/dejar-de-agendar-por-whatsapp", id: "dejar-de-agendar-por-whatsapp", cluster: "guide", intent: "transicion-desde-chat" },
  { path: "/guias/google-calendar-vs-sistema-reservas", id: "google-calendar-vs-sistema-reservas", cluster: "guide", intent: "calendario-vs-reservas" },
  { path: "/guias/organizar-agenda-varios-profesionales", id: "organizar-agenda-varios-profesionales", cluster: "guide", intent: "organizacion-equipo" },
  { path: "/alternativa-calendly", id: "alternativa-calendly", cluster: "alternative", intent: "evaluacion-calendly" },
  { path: "/alternativa-fresha", id: "alternativa-fresha", cluster: "alternative", intent: "evaluacion-fresha-chile" },
] as const satisfies readonly { path: string; id: string; cluster: SeoCluster; intent: string }[];

export function seoContentProperties(path: string): Record<string, string> {
  // Match a public pathname exactly. Tokens, query strings and arbitrary slugs never become properties.
  const page = seoExpansionPages.find((item) => item.path === path);
  return page ? {
    seo_content_id: page.id,
    seo_cluster: page.cluster,
    seo_batch: SEO_EXPANSION_BATCH,
    seo_intent: page.intent,
  } : {};
}

export const SEO_CONTENT_KEYS = ["seo_content_id", "seo_cluster", "seo_batch", "seo_intent"] as const;

export function isSafeSeoProperty(key: string, value: unknown) {
  if (key === "seo_batch") return value === SEO_EXPANSION_BATCH;
  return seoExpansionPages.some((page) =>
    key === "seo_content_id" ? page.id === value :
    key === "seo_cluster" ? page.cluster === value :
    key === "seo_intent" ? page.intent === value : false);
}
