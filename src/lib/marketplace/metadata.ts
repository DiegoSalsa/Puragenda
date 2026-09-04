import type { Metadata } from "next";
import { NOT_FOUND_ROBOTS } from "@/lib/crawler-policy";
import { createPageMetadata } from "@/lib/seo";
import type { MarketplaceCategoryPageModel, MarketplaceCityPageModel } from "./pages";

const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
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
