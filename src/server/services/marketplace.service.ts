import {
  buildMarketplaceQualityGateReport,
  mapPublishedListingToCandidates,
  type MarketplaceListingCandidate,
  type MarketplaceQualityGateReportRow,
} from "@/lib/marketplace";
import { prisma } from "@/server/db/prisma";

const publicListingSelect = {
  publishedAt: true,
  locality: { select: { slug: true } },
  location: { select: { id: true, slug: true, isActive: true } },
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
    where: { category: { seoEnabled: true } },
    select: { category: { select: { slug: true, isActive: true, seoEnabled: true } } },
  },
} as const;

/**
 * Public marketplace inventory. Whitelist select only.
 * Internal ids are used to resolve location-scoped services, then dropped
 * before candidates leave this module.
 */
function isMissingMarketplaceSchema(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    && (error.code === "P2021" || error.code === "P2022");
}

export async function listPublicMarketplaceListings(): Promise<MarketplaceListingCandidate[]> {
  try {
    const rows = await prisma.marketplaceListing.findMany({
      where: {
        publishedAt: { not: null },
        authorizationConfirmedAt: { not: null },
        locality: { isActive: true },
        location: { isActive: true },
        business: { deletedAt: null },
        categories: { some: { category: { seoEnabled: true } } },
      },
      select: publicListingSelect,
    });

    return rows.flatMap(mapPublishedListingToCandidates);
  } catch (error) {
    if (isMissingMarketplaceSchema(error)) return [];
    throw error;
  }
}

export async function getMarketplaceQualityGateReport(): Promise<MarketplaceQualityGateReportRow[]> {
  const inventory = await listPublicMarketplaceListings();
  return buildMarketplaceQualityGateReport(inventory);
}
