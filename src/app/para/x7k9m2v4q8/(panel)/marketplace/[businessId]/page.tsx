import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons/hover-icons";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getMarketplaceBusinessEditor } from "@/server/services/marketplace-admin.service";
import { MarketplaceEditor } from "./marketplace-editor";

export const dynamic = "force-dynamic";

export default async function MarketplaceBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const editor = await getMarketplaceBusinessEditor(businessId);
  if (!editor) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`${ADMIN_SECRET_PATH}/marketplace`}
        className="inline-flex items-center gap-1 text-sm font-black uppercase text-black hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Marketplace
      </Link>
      <MarketplaceEditor
        business={{
          id: editor.business.id,
          name: editor.business.name,
          slug: editor.business.slug,
          deleted: Boolean(editor.business.deletedAt),
          plan: editor.business.subscription?.plan ?? "SIN PLAN",
          status: editor.business.subscription?.status ?? "SIN SUB",
          locations: editor.business.locations,
          listings: editor.business.marketplaceListings.map((listing) => ({
            locationId: listing.locationId,
            localityId: listing.localityId,
            categoryIds: listing.categories.map((entry) => entry.categoryId),
            authorizationConfirmed: Boolean(listing.authorizationConfirmedAt),
            published: Boolean(listing.publishedAt),
          })),
          services: editor.business.services.map((service) => ({
            name: service.name,
            bookingMode: service.bookingMode,
            locationIds: service.locations.map((item) => item.locationId),
          })),
        }}
        categories={editor.categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
          isActive: category.isActive,
          seoEnabled: category.seoEnabled,
        }))}
        localities={editor.localities}
      />
    </div>
  );
}
