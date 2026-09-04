import type { Metadata } from "next";
import {
  MarketplaceCityPage,
  generateMarketplaceCityMetadata,
  generateMarketplaceCityStaticParams,
} from "@/components/marketplace/marketplace-pages";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  return generateMarketplaceCityMetadata("barberias")({ params });
}

export function generateStaticParams() {
  return generateMarketplaceCityStaticParams("barberias")();
}

export default async function BarberiasCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <MarketplaceCityPage categorySlug="barberias" city={city} />;
}
