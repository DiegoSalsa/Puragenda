import type { Metadata } from "next";
import {
  MarketplaceCategoryPage,
  generateMarketplaceCategoryMetadata,
} from "@/components/marketplace/marketplace-pages";

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return generateMarketplaceCategoryMetadata("peluquerias")();
}

export default function PeluqueriasDirectoryPage() {
  return <MarketplaceCategoryPage categorySlug="peluquerias" />;
}
