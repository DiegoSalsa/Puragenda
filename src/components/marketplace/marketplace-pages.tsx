import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { JsonLd } from "@/components/json-ld";
import { LandingLayout } from "@/components/landing/landing-layout";
import {
  MARKETPLACE_NOT_FOUND_METADATA,
  getIndexableCitySlugs,
  marketplaceCategoryJsonLd,
  marketplaceCityJsonLd,
  marketplacePageMetadata,
  resolveMarketplaceCategoryPage,
  resolveMarketplaceCityPage,
  type MarketplaceCategoryPageModel,
  type MarketplaceCityPageModel,
  type MarketplaceCategorySlug,
  type PublicMarketplaceCard,
} from "@/lib/marketplace";
import { listPublicMarketplaceListings } from "@/server/services/marketplace.service";

async function inventory() {
  return listPublicMarketplaceListings();
}

export function generateMarketplaceCategoryMetadata(categorySlug: MarketplaceCategorySlug) {
  return async function generateMetadata(): Promise<Metadata> {
    const page = resolveMarketplaceCategoryPage(categorySlug, { inventory: await inventory() });
    if (page.kind === "not_found") return MARKETPLACE_NOT_FOUND_METADATA;
    return marketplacePageMetadata(page);
  };
}

export function generateMarketplaceCityMetadata(categorySlug: MarketplaceCategorySlug) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ city: string }>;
  }): Promise<Metadata> {
    const { city } = await params;
    const listings = await inventory();
    const page = resolveMarketplaceCityPage(categorySlug, city, { inventory: listings });
    if (page.kind === "not_found") return MARKETPLACE_NOT_FOUND_METADATA;
    if (page.kind === "redirect") {
      const canonical = resolveMarketplaceCityPage(
        categorySlug,
        page.to.slice(page.to.lastIndexOf("/") + 1),
        { inventory: listings },
      );
      if (canonical.kind !== "city") return MARKETPLACE_NOT_FOUND_METADATA;
      return {
        ...marketplacePageMetadata(canonical),
        robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
      };
    }
    return marketplacePageMetadata(page);
  };
}

export function generateMarketplaceCityStaticParams(categorySlug: MarketplaceCategorySlug) {
  return async function generateStaticParams() {
    const slugs = getIndexableCitySlugs(categorySlug, { inventory: await inventory() });
    return slugs.map((city) => ({ city }));
  };
}

export async function MarketplaceCategoryPage({
  categorySlug,
}: {
  categorySlug: MarketplaceCategorySlug;
}) {
  const page = resolveMarketplaceCategoryPage(categorySlug, { inventory: await inventory() });
  if (page.kind === "not_found") notFound();
  return <MarketplaceCategoryView page={page} />;
}

export async function MarketplaceCityPage({
  categorySlug,
  city,
}: {
  categorySlug: MarketplaceCategorySlug;
  city: string;
}) {
  const page = resolveMarketplaceCityPage(categorySlug, city, { inventory: await inventory() });
  if (page.kind === "not_found") notFound();
  if (page.kind === "redirect") permanentRedirect(page.to);
  return <MarketplaceCityView page={page} />;
}

function MarketplaceCategoryView({ page }: { page: MarketplaceCategoryPageModel }) {
  return (
    <LandingLayout>
      <JsonLd data={marketplaceCategoryJsonLd(page)} />
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-16">
        <p className="mb-4 inline-block border-2 border-black bg-[#BFFCC6] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white dark:shadow-[4px_4px_0_#FFFFFF]">
          Directorio para reservar
        </p>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl">{page.h1}</h1>
        <p className="mt-6 max-w-3xl text-xl font-bold opacity-80">{page.lead}</p>
        <B2bCta page={page} placement="category_secondary" />

        {page.cities.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-black uppercase tracking-tight">Ciudades con oferta pública</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {page.cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={city.path}
                    className="block rounded-2xl border-4 border-black bg-white p-4 font-black text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-black dark:text-white"
                  >
                    {page.category.name} en {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-12 max-w-3xl text-base font-bold opacity-70">{page.emptyMessage}</p>
        )}

        {page.indexable && page.listings.length > 0 ? (
          <ListingGrid cards={page.listings} heading="Locales públicos" />
        ) : null}
      </section>
    </LandingLayout>
  );
}

function MarketplaceCityView({ page }: { page: MarketplaceCityPageModel }) {
  return (
    <LandingLayout>
      <JsonLd data={marketplaceCityJsonLd(page)} />
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-16">
        <nav aria-label="Miga de pan" className="mb-8 text-sm font-bold">
          <ol className="flex flex-wrap items-center gap-2 opacity-70">
            <li>
              <Link href="/" className="underline underline-offset-4 hover:text-[#7C3AED]">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={page.parentPath} className="underline underline-offset-4 hover:text-[#7C3AED]">
                {page.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>{page.city.name}</li>
          </ol>
        </nav>
        <p className="mb-4 inline-block border-2 border-black bg-[#85E3FF] px-4 py-1 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:border-white dark:shadow-[4px_4px_0_#FFFFFF]">
          Reserva en {page.city.name}
        </p>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl">{page.h1}</h1>
        <p className="mt-6 max-w-3xl text-xl font-bold opacity-80">{page.lead}</p>
        <B2bCta page={page} placement="city_secondary" />

        {page.listings.length > 0 ? (
          <ListingGrid cards={page.listings} heading="Locales públicos" />
        ) : (
          <p className="mt-12 max-w-3xl text-base font-bold opacity-70">{page.emptyMessage}</p>
        )}
      </section>
    </LandingLayout>
  );
}

function ListingGrid({ cards, heading }: { cards: PublicMarketplaceCard[]; heading: string }) {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-black uppercase tracking-tight">{heading}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <li
            key={card.bookingPath}
            className="rounded-2xl border-4 border-black bg-white p-5 text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-black dark:text-white"
          >
            <p className="text-lg font-black">{card.name}</p>
            <p className="mt-1 text-sm font-bold opacity-70">{card.cityName}</p>
            {card.serviceNames.length > 0 ? (
              <p className="mt-3 text-sm font-bold opacity-80">{card.serviceNames.join(" · ")}</p>
            ) : null}
            <Link
              href={card.bookingPath}
              className="mt-4 inline-flex font-black text-[#5B21B6] underline underline-offset-4"
            >
              Reservar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function B2bCta({
  page,
  placement,
}: {
  page: MarketplaceCategoryPageModel | MarketplaceCityPageModel;
  placement: string;
}) {
  return (
    <p className="mt-8 text-sm font-bold opacity-70">
      {page.category.b2bSoftwareCta}{" "}
      <TrackedLink
        href={page.category.b2bSoftwarePath}
        cta="b2b_software"
        placement={placement}
        className="text-[#7C3AED] underline underline-offset-4"
      >
        Software de agenda
      </TrackedLink>
    </p>
  );
}
