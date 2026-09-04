import { breadcrumbListNode, jsonLdGraph } from "@/lib/json-ld";
import { absoluteUrl } from "@/lib/site";
import type { MarketplaceCategoryPageModel, MarketplaceCityPageModel } from "./pages";

function itemListNode(name: string, cards: MarketplaceCityPageModel["listings"]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: cards.length,
    itemListElement: cards.map((card, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: card.name,
      url: absoluteUrl(card.bookingPath),
    })),
  };
}

function collectionPageNode(name: string, url: string, description: string) {
  return {
    "@type": "CollectionPage",
    name,
    url,
    description,
  };
}

/**
 * Aggregator pages are CollectionPage + optional ItemList + breadcrumbs.
 * Never LocalBusiness, never SoftwareApplication, never invented ratings.
 * ItemList only when the page is indexable and has real listings.
 */
export function marketplaceCategoryJsonLd(page: MarketplaceCategoryPageModel) {
  const nodes: Record<string, unknown>[] = [
    breadcrumbListNode([
      { name: "Inicio", path: "/" },
      { name: page.category.name, path: page.path },
    ]),
  ];

  if (page.indexable) {
    nodes.unshift(collectionPageNode(page.h1, absoluteUrl(page.path), page.description));
    if (page.listings.length > 0) {
      nodes.push(itemListNode(page.h1, page.listings));
    }
  }

  return jsonLdGraph(nodes);
}

export function marketplaceCityJsonLd(page: MarketplaceCityPageModel) {
  const nodes: Record<string, unknown>[] = [
    breadcrumbListNode([
      { name: "Inicio", path: "/" },
      { name: page.category.name, path: page.parentPath },
      { name: page.city.name, path: page.path },
    ]),
  ];

  if (page.indexable) {
    nodes.unshift(collectionPageNode(page.h1, absoluteUrl(page.path), page.description));
    if (page.listings.length > 0) {
      nodes.push(itemListNode(page.h1, page.listings));
    }
  }

  return jsonLdGraph(nodes);
}
