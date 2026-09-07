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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6">
      <DirectoryAnalytics />
      <p className="mb-3 inline-block border-2 border-black bg-[#B28DFF] px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#000]">
        Puragenda Marketplace
      </p>
      <h1 className="max-w-3xl text-4xl font-black uppercase tracking-tighter sm:text-5xl">
        Encuentra un negocio y reserva tu hora
      </h1>
      <p className="mt-3 max-w-2xl text-base font-bold opacity-80 sm:text-lg">
        Descubre locales que usan Puragenda y agenda directo en su widget.
      </p>

      <DirectorySearch result={result} />

      <div className="mt-8" aria-live="polite">
        {result.emptyKind === "none" ? (
          <>
            <p className="text-sm font-bold opacity-70">
              {result.total} {result.total === 1 ? "negocio" : "negocios"}
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {result.cards.map((card) => (
                <li key={card.bookingPath}>
                  <MarketplaceListingCard
                    name={card.name}
                    bookingPath={card.bookingPath}
                    cityName={card.cityName}
                    categoryNames={card.categoryNames}
                    locationName={card.locationName}
                    logoUrl={card.logoUrl}
                    serviceNames={card.serviceNames}
                    ctaLabel="Reservar"
                    trackBooking
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <p className="text-base font-bold">{marketplaceDirectoryEmptyMessage(result)}</p>
            {hasFilters ? (
              <Link
                href={MARKETPLACE_DIRECTORY_PATH}
                className="mt-4 inline-flex min-h-11 items-center font-black uppercase text-[#5B21B6] underline underline-offset-4"
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
