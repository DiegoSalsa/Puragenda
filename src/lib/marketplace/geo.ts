/**
 * Canonical Chilean locality slugs for marketplace URLs.
 *
 * This is a slug dictionary, not a list of generated pages. A city in this
 * registry can resolve (and redirect aliases); it is NOT indexable unless
 * the quality gate passes with real public inventory.
 *
 * Grain: city-level names people search (Concepción, Santiago), not every
 * comuna. Commune-level URLs wait until businesses have structured locality.
 */

export type CanonicalCity = {
  slug: string;
  name: string;
  aliases: readonly string[];
};

export const MARKETPLACE_CITIES: readonly CanonicalCity[] = [
  { slug: "arica", name: "Arica", aliases: ["arica-chile"] },
  { slug: "iquique", name: "Iquique", aliases: ["iquique-chile"] },
  { slug: "antofagasta", name: "Antofagasta", aliases: ["antofagasta-chile"] },
  { slug: "copiapo", name: "Copiapó", aliases: ["copiapó", "copiapo-chile"] },
  { slug: "la-serena", name: "La Serena", aliases: ["laserena", "la-serena-chile"] },
  { slug: "coquimbo", name: "Coquimbo", aliases: ["coquimbo-chile"] },
  {
    slug: "valparaiso",
    name: "Valparaíso",
    aliases: ["valparaíso", "valparaiso-chile", "valparaiso-region"],
  },
  {
    slug: "vina-del-mar",
    name: "Viña del Mar",
    aliases: ["viña-del-mar", "vina", "vinadelmar"],
  },
  {
    slug: "santiago",
    name: "Santiago",
    aliases: ["santiago-chile", "santiago-de-chile", "santiago-rm", "stgo"],
  },
  { slug: "rancagua", name: "Rancagua", aliases: ["rancagua-chile"] },
  { slug: "talca", name: "Talca", aliases: ["talca-chile"] },
  { slug: "chillan", name: "Chillán", aliases: ["chillán", "chillan-chile"] },
  {
    slug: "concepcion",
    name: "Concepción",
    aliases: ["concepción", "concepcion-chile", "concepcion-biobio", "concepcion-bio-bio"],
  },
  { slug: "talcahuano", name: "Talcahuano", aliases: ["talcahuano-chile"] },
  { slug: "los-angeles", name: "Los Ángeles", aliases: ["los-ángeles", "losangeles"] },
  { slug: "temuco", name: "Temuco", aliases: ["temuco-chile"] },
  { slug: "valdivia", name: "Valdivia", aliases: ["valdivia-chile"] },
  { slug: "osorno", name: "Osorno", aliases: ["osorno-chile"] },
  { slug: "puerto-montt", name: "Puerto Montt", aliases: ["puertomontt", "puerto-montt-chile"] },
  { slug: "coyhaique", name: "Coyhaique", aliases: ["coihaique", "coyhaique-chile"] },
  { slug: "punta-arenas", name: "Punta Arenas", aliases: ["puntaarenas", "punta-arenas-chile"] },
];

/**
 * URL slug: strip Spanish diacritics (áéíóúüñ) to ASCII. Visible copy keeps
 * the canonical `name` (Concepción, Ñuñoa).
 *
 * Mirrors `toSlug` without the business fallback `"mi-negocio"`.
 */
export function normalizeGeoSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const citiesBySlug = new Map(MARKETPLACE_CITIES.map((city) => [city.slug, city]));
const cityAliasToCanonical = new Map<string, string>();

for (const city of MARKETPLACE_CITIES) {
  cityAliasToCanonical.set(city.slug, city.slug);
  for (const alias of city.aliases) {
    cityAliasToCanonical.set(normalizeGeoSlug(alias), city.slug);
  }
}

export function isCanonicalCitySlug(slug: string): boolean {
  return citiesBySlug.has(slug);
}

export function getCanonicalCity(slug: string): CanonicalCity | null {
  return citiesBySlug.get(slug) ?? null;
}

export function resolveCanonicalCity(input: string): CanonicalCity | null {
  const normalized = normalizeGeoSlug(input);
  if (!normalized) return null;
  const canonicalSlug = cityAliasToCanonical.get(normalized);
  if (!canonicalSlug) return null;
  return citiesBySlug.get(canonicalSlug) ?? null;
}

export function cityDisplayName(slug: string): string {
  return citiesBySlug.get(slug)?.name ?? slug;
}
