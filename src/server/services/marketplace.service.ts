import {
  buildMarketplaceDirectoryResult,
  buildMarketplaceQualityGateReport,
  isMarketplacePubliclyVisible,
  mapPublishedListingToCandidates,
  mapPublishedListingToDirectoryCard,
  parseMarketplaceDirectoryQuery,
  withMarketplaceRating,
  type MarketplaceDirectoryQuery,
  type MarketplaceDirectoryResult,
  type MarketplaceListingCandidate,
  type MarketplaceQualityGateReportRow,
  type PublicMarketplaceCard,
  type PublicMarketplaceDirectoryCard,
} from "@/lib/marketplace";
import { prisma } from "@/server/db/prisma";
import { getBusinessRatingSummariesBySlug } from "@/server/services/reviews.service";

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

function isTransientPublicInventoryFailure(error: unknown) {
  if (isMissingMarketplaceSchema(error)) return true;
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (["P1001", "P1002", "P1017", "P2024"].includes(code)) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /connection terminated|connection closed|ECONNRESET|ETIMEDOUT|timeout expired/i.test(message);
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
    if (isTransientPublicInventoryFailure(error)) return [];
    throw error;
  }
}

export async function listSeoMarketplaceListings(): Promise<MarketplaceListingCandidate[]> {
  try {
    const rows = await loadPublicListingRows({ some: { category: { seoEnabled: true } } });
    return rows.flatMap((row) => mapPublishedListingToCandidates(row, { categoryFilter: "seoEnabled" }));
  } catch (error) {
    if (isTransientPublicInventoryFailure(error)) return [];
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
    const withRatings = await attachDirectoryRatings(cards);
    return buildMarketplaceDirectoryResult(withRatings, parsed);
  } catch (error) {
    if (isTransientPublicInventoryFailure(error)) {
      return buildMarketplaceDirectoryResult([], parsed);
    }
    throw error;
  }
}

export async function getMarketplaceQualityGateReport(): Promise<MarketplaceQualityGateReportRow[]> {
  const inventory = await listPublicMarketplaceListings();
  return buildMarketplaceQualityGateReport(inventory);
}

async function attachDirectoryRatings<T extends { bookingPath: string; ratingAverage: number | null; ratingCount: number }>(
  cards: T[],
): Promise<T[]> {
  const slugs = [...new Set(cards.map((card) => slugFromBookingPath(card.bookingPath)).filter(Boolean))];
  const stats = await getBusinessRatingSummariesBySlug(slugs);
  return cards.map((card) => withMarketplaceRating(card, stats.get(slugFromBookingPath(card.bookingPath))));
}

function slugFromBookingPath(bookingPath: string) {
  const match = bookingPath.match(/^\/widget\/([^/?]+)/);
  return match?.[1] ?? "";
}

export async function attachPublicCardRatings(cards: PublicMarketplaceCard[]): Promise<PublicMarketplaceCard[]> {
  return attachDirectoryRatings(cards);
}
