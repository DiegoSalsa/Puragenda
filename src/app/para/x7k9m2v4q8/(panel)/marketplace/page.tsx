import { ADMIN_SECRET_PATH } from "@/core/constants";
import { MARKETPLACE_QUALITY_GATE, marketplaceConsentState } from "@/lib/marketplace";
import { getMarketplaceQualityGateReport } from "@/server/services/marketplace.service";
import { listMarketplaceAdminRows } from "@/server/services/marketplace-admin.service";
import { MarketplaceClient } from "./marketplace-client";

export const dynamic = "force-dynamic";

export default async function MarketplaceAdminPage() {
  const [rows, report] = await Promise.all([
    listMarketplaceAdminRows(),
    getMarketplaceQualityGateReport(),
  ]);

  return (
    <MarketplaceClient
      adminPath={ADMIN_SECRET_PATH}
      indexingEnabled={MARKETPLACE_QUALITY_GATE.indexingEnabled}
      minPublicBusinesses={MARKETPLACE_QUALITY_GATE.minPublicBusinesses}
      minBookableServices={MARKETPLACE_QUALITY_GATE.minBookableServices}
      report={report}
      businesses={rows.map((business) => ({
        id: business.id,
        name: business.name,
        slug: business.slug,
        deleted: Boolean(business.deletedAt),
        plan: business.subscription?.plan ?? "SIN PLAN",
        status: business.subscription?.status ?? "SIN SUB",
        consentState: marketplaceConsentState({
          promptDismissedAt: business.marketplacePromptDismissedAt,
          listings: business.marketplaceListings,
        }),
        listings: business.marketplaceListings.map((listing) => {
          const authorized = Boolean(listing.authorizationConfirmedAt) && !listing.authorizationRevokedAt;
          const categories = listing.categories.map((entry) => entry.category.name);
          if (listing.pendingCategoryDescription && categories.length === 0) {
            categories.push("Pendiente");
          }
          return {
            published: Boolean(listing.publishedAt),
            authorized,
            revoked: Boolean(listing.authorizationRevokedAt),
            locality: listing.locality?.name
              || (listing.pendingLocalityName ? `Pendiente (${listing.pendingLocalityName})` : "Pendiente"),
            location: listing.location.name,
            locationActive: listing.location.isActive,
            categories,
          };
        }),
      }))}
    />
  );
}
