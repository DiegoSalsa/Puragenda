/**
 * Controlled B2C marketplace taxonomy.
 *
 * Barberías / peluquerías are NOT platform categories on Business.
 * They exist today only as B2B marketing slugs (`/para/{industry}` and
 * software landings). This allowlist is the only set of marketplace
 * categories that may ever become indexable.
 */

export const MARKETPLACE_CATEGORY_SLUGS = ["barberias", "peluquerias"] as const;

export type MarketplaceCategorySlug = (typeof MARKETPLACE_CATEGORY_SLUGS)[number];

export type MarketplaceCategory = {
  slug: MarketplaceCategorySlug;
  name: string;
  singularName: string;
  aliases: readonly string[];
  h1National: string;
  titleNational: string;
  descriptionNational: string;
  leadNational: string;
  emptyNational: string;
  cityTitle: (cityName: string) => string;
  cityH1: (cityName: string) => string;
  cityDescription: (cityName: string) => string;
  cityLead: (cityName: string) => string;
  cityEmpty: (cityName: string) => string;
  keywordsNational: readonly string[];
  cityKeywords: (cityName: string) => readonly string[];
  b2bSoftwarePath: string;
  b2bSoftwareCta: string;
  b2bSpokePath: string;
};

/**
 * Intent split (do not mix copy, titles or canonicals):
 *
 * B2B software: "software de agenda para barberías"
 *   /software-agenda-barberias, /software-agenda-peluquerias
 * B2B rubro:    "Puragenda para barberías"
 *   /para/barberias, /para/peluquerias
 * B2C discovery: "barberías en Concepción" / "reservar en una peluquería"
 *   /barberias, /barberias/{ciudad}, /peluquerias, /peluquerias/{ciudad}
 */
export const MARKETPLACE_CATEGORIES: readonly MarketplaceCategory[] = [
  {
    slug: "barberias",
    name: "Barberías",
    singularName: "Barbería",
    aliases: ["barberia", "barbershop", "barbershops"],
    h1National: "Barberías para reservar",
    titleNational: "Barberías",
    descriptionNational:
      "Encuentra barberías en Chile y reserva online. Este directorio es para quien busca una hora, no para comprar software de agenda.",
    leadNational:
      "Directorio para reservar en barberías. Si administras el local, el software de agenda está en otra página.",
    emptyNational:
      "Todavía no hay suficientes barberías públicas en el directorio para mostrar un listado.",
    cityTitle: (cityName) => `Barberías en ${cityName}`,
    cityH1: (cityName) => `Barberías en ${cityName}`,
    cityDescription: (cityName) =>
      `Barberías en ${cityName} con reserva online. Elige un local y agenda desde su enlace. No es software para administrar una barbería.`,
    cityLead: (cityName) =>
      `Locales públicos en ${cityName} donde puedes reservar. No es un listado de software para barberías.`,
    cityEmpty: (cityName) =>
      `Aún no hay suficientes barberías públicas en ${cityName} para publicar un directorio.`,
    keywordsNational: ["barberías", "reservar barbería", "barberías en Chile"],
    cityKeywords: (cityName) => [
      `barberías en ${cityName}`,
      `reservar barbería ${cityName}`,
    ],
    b2bSoftwarePath: "/software-agenda-barberias",
    b2bSoftwareCta: "¿Tienes una barbería?",
    b2bSpokePath: "/para/barberias",
  },
  {
    slug: "peluquerias",
    name: "Peluquerías",
    singularName: "Peluquería",
    aliases: ["peluqueria", "hair-salon", "hair-salons"],
    h1National: "Peluquerías para reservar",
    titleNational: "Peluquerías",
    descriptionNational:
      "Encuentra peluquerías en Chile y reserva online. Este directorio es para clientas y clientes, no para comprar software de agenda.",
    leadNational:
      "Directorio para reservar en peluquerías. Si administras el salón, el software de agenda está en otra página.",
    emptyNational:
      "Todavía no hay suficientes peluquerías públicas en el directorio para mostrar un listado.",
    cityTitle: (cityName) => `Peluquerías en ${cityName}`,
    cityH1: (cityName) => `Peluquerías en ${cityName}`,
    cityDescription: (cityName) =>
      `Peluquerías en ${cityName} con reserva online. Elige un salón y agenda desde su enlace. No es software para administrar una peluquería.`,
    cityLead: (cityName) =>
      `Salones públicos en ${cityName} donde puedes reservar. No es un listado de software para peluquerías.`,
    cityEmpty: (cityName) =>
      `Aún no hay suficientes peluquerías públicas en ${cityName} para publicar un directorio.`,
    keywordsNational: ["peluquerías", "reservar peluquería", "peluquerías en Chile"],
    cityKeywords: (cityName) => [
      `peluquerías en ${cityName}`,
      `reservar peluquería ${cityName}`,
    ],
    b2bSoftwarePath: "/software-agenda-peluquerias",
    b2bSoftwareCta: "¿Tienes una peluquería?",
    b2bSpokePath: "/para/peluquerias",
  },
];

const categoriesBySlug = new Map(MARKETPLACE_CATEGORIES.map((category) => [category.slug, category]));

const categoryAliasToCanonical = new Map<string, MarketplaceCategorySlug>();
for (const category of MARKETPLACE_CATEGORIES) {
  categoryAliasToCanonical.set(category.slug, category.slug);
  for (const alias of category.aliases) {
    categoryAliasToCanonical.set(alias, category.slug);
  }
}

export function isSupportedMarketplaceCategory(slug: string): slug is MarketplaceCategorySlug {
  return categoriesBySlug.has(slug as MarketplaceCategorySlug);
}

export function getMarketplaceCategory(slug: string): MarketplaceCategory | null {
  return categoriesBySlug.get(slug as MarketplaceCategorySlug) ?? null;
}

export function resolveMarketplaceCategorySlug(input: string): MarketplaceCategorySlug | null {
  return categoryAliasToCanonical.get(input) ?? null;
}

export function marketplaceCategoryPath(slug: MarketplaceCategorySlug): string {
  return `/${slug}`;
}

export function marketplaceCityPath(slug: MarketplaceCategorySlug, citySlug: string): string {
  return `/${slug}/${citySlug}`;
}

export function marketplaceAliasRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return MARKETPLACE_CATEGORIES.flatMap((category) =>
    category.aliases.flatMap((alias) => [
      {
        source: `/${alias}`,
        destination: `/${category.slug}`,
        permanent: true as const,
      },
      {
        source: `/${alias}/:city`,
        destination: `/${category.slug}/:city`,
        permanent: true as const,
      },
    ]),
  );
}
