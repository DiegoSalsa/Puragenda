import type { Metadata } from "next";
import { NOT_FOUND_ROBOTS } from "@/lib/crawler-policy";
import { createPageMetadata } from "@/lib/seo";
import { MARKETPLACE_DIRECTORY_PATH } from "./directory";
import { MARKETPLACE_QUALITY_GATE } from "./quality-gate";
import type { MarketplaceCategoryPageModel, MarketplaceCityPageModel } from "./pages";

const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} as const;

const DIRECTORY_NOINDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
} as const;

export const MARKETPLACE_NOT_FOUND_METADATA: Metadata = {
  robots: NOT_FOUND_ROBOTS,
  alternates: { canonical: null },
};

export function marketplacePageMetadata(
  page: MarketplaceCategoryPageModel | MarketplaceCityPageModel,
): Metadata {
  const metadata = createPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: [...page.keywords],
  });

  if (page.indexable) return metadata;

  return {
    ...metadata,
    robots: NOINDEX_ROBOTS,
  };
}

export function marketplaceDirectoryMetadata(): Metadata {
  const metadata = createPageMetadata({
    title: "Encuentra un negocio y reserva tu hora",
    description:
      "Directorio de negocios en Puragenda. Busca por rubro o comuna y reserva tu hora en el widget del local.",
    path: MARKETPLACE_DIRECTORY_PATH,
    keywords: ["reservar hora", "directorio Puragenda", "negocios en Chile"],
  });

  if (MARKETPLACE_QUALITY_GATE.indexingEnabled) return metadata;

  return {
    ...metadata,
    robots: DIRECTORY_NOINDEX_FOLLOW_ROBOTS,
  };
}
