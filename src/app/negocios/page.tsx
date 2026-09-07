import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { MarketplaceDirectoryView } from "@/components/marketplace/directory-page";
import { marketplaceDirectoryMetadata } from "@/lib/marketplace";
import { listPublicMarketplaceDirectory } from "@/server/services/marketplace.service";

export const revalidate = 60;

export function generateMetadata(): Metadata {
  return marketplaceDirectoryMetadata();
}

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = await listPublicMarketplaceDirectory(params);

  return (
    <LandingLayout>
      <MarketplaceDirectoryView result={result} />
    </LandingLayout>
  );
}
