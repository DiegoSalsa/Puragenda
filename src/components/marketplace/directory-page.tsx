import Link from "next/link";
import { DirectoryAnalytics } from "@/components/marketplace/directory-analytics";
import { DirectorySearch } from "@/components/marketplace/directory-search";
import { MarketplaceListingCard } from "@/components/marketplace/marketplace-listing-card";
import {
  MARKETPLACE_DIRECTORY_PATH,
  marketplaceDirectoryEmptyMessage,
  marketplaceDirectoryHasFilters,
  type MarketplaceDirectoryResult,
} from "@/lib/marketplace";

export function MarketplaceDirectoryView({ result }: { result: MarketplaceDirectoryResult }) {
  const hasFilters = marketplaceDirectoryHasFilters(result.query);
  const countLabel = result.total === 1 ? "1 negocio disponible" : `${result.total} negocios disponibles`;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6">
      <DirectoryAnalytics />
      <p className="mb-3 inline-block border border-black bg-[#B28DFF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000]">
        Puragenda Marketplace
      </p>
      <h1 className="max-w-3xl text-3xl font-black tracking-tight text-black sm:text-4xl">
        Encuentra un negocio y reserva tu hora
      </h1>
      <p className="mt-2 max-w-xl text-sm font-medium text-black/70 sm:text-base">
        Elige un local y reserva directo en su agenda.
      </p>

      <DirectorySearch result={result} />

      <div className="mt-6" aria-live="polite">
        {result.emptyKind === "none" ? (
          <>
            <p className="text-sm font-semibold text-black/60">{countLabel}</p>
            <ul className="mt-3 grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
              {result.cards.map((card) => (
                <li key={card.bookingPath} className="min-w-0">
                  <MarketplaceListingCard
                    name={card.name}
                    bookingPath={card.bookingPath}
                    cityName={card.cityName}
                    categoryNames={card.categoryNames}
                    categorySlugs={card.categorySlugs}
                    locationName={card.locationName}
                    logoUrl={card.logoUrl}
                    serviceNames={card.serviceNames}
                    ctaLabel="Ver horas"
                    trackBooking
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-black bg-white px-5 py-8 text-center shadow-[3px_3px_0_#000]">
            <p className="text-base font-bold">{marketplaceDirectoryEmptyMessage(result)}</p>
            {hasFilters ? (
              <Link
                href={MARKETPLACE_DIRECTORY_PATH}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-[#7C3AED] px-4 text-sm font-black text-white shadow-[2px_2px_0_#000]"
              >
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
