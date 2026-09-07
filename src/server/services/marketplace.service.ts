import {
  buildMarketplaceDirectoryResult,
  buildMarketplaceQualityGateReport,
  isMarketplacePubliclyVisible,
  mapPublishedListingToCandidates,
  mapPublishedListingToDirectoryCard,
  parseMarketplaceDirectoryQuery,
  type MarketplaceDirectoryQuery,
  type MarketplaceDirectoryResult,
  type MarketplaceListingCandidate,
  type MarketplaceQualityGateReportRow,
  type PublicMarketplaceDirectoryCard,
} from "@/lib/marketplace";
import { prisma } from "@/server/db/prisma";

const publicListingSelect = {
  status: true,
  publishedAt: true,
  locality: { select: { slug: true, name: true, regionName: true } },
  location: { select: { id: true, slug: true, name: true, isActive: true } },
  business: {
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      deletedAt: true,
      productionOrdersEnabled: true,
      subscription: { select: { plan: true, status: true } },
      services: {
        select: {
          name: true,
          bookingMode: true,
          locations: { select: { locationId: true } },
        },
      },
    },
  },
  categories: {
    select: { category: { select: { slug: true, name: true, isActive: true, seoEnabled: true } } },
  },
} as const;

const publicDirectoryWhere = {
  status: "ACTIVE" as const,
  publishedAt: { not: null },
  authorizationConfirmedAt: { not: null },
  authorizationRevokedAt: null,
  locality: { isActive: true },
  location: { isActive: true },
  business: { deletedAt: null },
};

/**
 * Public marketplace inventory. Whitelist select only.
 * Internal ids are used to resolve location-scoped services, then dropped
 * before candidates leave this module.
 */
function isMissingMarketplaceSchema(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    && (error.code === "P2021" || error.code === "P2022");
}

async function loadPublicListingRows(categoryWhere: {
  some: { category: { isActive?: boolean; seoEnabled?: boolean } };
}) {
  return prisma.marketplaceListing.findMany({
    where: {
      ...publicDirectoryWhere,
      categories: categoryWhere,
    },
    select: publicListingSelect,
  });
}

export async function listPublicMarketplaceListings(): Promise<MarketplaceListingCandidate[]> {
  try {
    const rows = await loadPublicListingRows({ some: { category: { isActive: true } } });
    return rows
      .flatMap((row) => mapPublishedListingToCandidates(row, { categoryFilter: "isActive" }))
      .filter(isMarketplacePubliclyVisible);
  } catch (error) {
    if (isMissingMarketplaceSchema(error)) return [];
    throw error;
  }
}

export async function listSeoMarketplaceListings(): Promise<MarketplaceListingCandidate[]> {
  try {
    const rows = await loadPublicListingRows({ some: { category: { seoEnabled: true } } });
    return rows.flatMap((row) => mapPublishedListingToCandidates(row, { categoryFilter: "seoEnabled" }));
  } catch (error) {
    if (isMissingMarketplaceSchema(error)) return [];
    throw error;
  }
}

export async function listPublicMarketplaceDirectory(
  query: MarketplaceDirectoryQuery | Record<string, string | string[] | undefined> = {},
): Promise<MarketplaceDirectoryResult> {
  const parsed = parseMarketplaceDirectoryQuery(query);
  try {
    const rows = await loadPublicListingRows({ some: { category: { isActive: true } } });
    const cards = rows
      .map(mapPublishedListingToDirectoryCard)
      .filter((card): card is PublicMarketplaceDirectoryCard => card != null)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return buildMarketplaceDirectoryResult(cards, parsed);
  } catch (error) {
    if (isMissingMarketplaceSchema(error)) {
      return buildMarketplaceDirectoryResult([], parsed);
    }
    throw error;
  }
}

export async function getMarketplaceQualityGateReport(): Promise<MarketplaceQualityGateReportRow[]> {
  const inventory = await listPublicMarketplaceListings();
  return buildMarketplaceQualityGateReport(inventory);
}
