import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingLayout } from "@/components/landing/landing-layout";
import { RatingSummary } from "@/components/reviews/rating-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { getPublicBusinessProfile } from "@/server/services/reviews.service";
import { MARKETPLACE_NOT_FOUND_METADATA } from "@/lib/marketplace";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicBusinessProfile(slug);
  if (!profile) return MARKETPLACE_NOT_FOUND_METADATA;
  return {
    title: `${profile.business.name} · opiniones verificadas`,
    description: `Opiniones de clientes con reserva verificada en ${profile.business.name}.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `https://www.puragenda.cl/negocios/${profile.business.slug}` },
  };
}

export default async function NegocioPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getPublicBusinessProfile(slug);
  if (!profile) notFound();

  const { business, summary, reviews } = profile;
  const categories = business.marketplaceListings
    .flatMap((listing) => listing.categories.map((entry) => entry.category.name).filter(Boolean))
    .filter((name, index, all) => all.indexOf(name) === index);
  const location = business.marketplaceListings[0];
  const bookingPath = location?.location.slug
    ? `/widget/${business.slug}?location=${encodeURIComponent(location.location.slug)}`
    : `/widget/${business.slug}`;

  return (
    <LandingLayout>
      <section className="mx-auto w-full max-w-4xl px-4 pt-4 pb-16 sm:px-6">
        <p className="mb-3 inline-block border border-black bg-[#B28DFF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000]">
          Perfil público
        </p>
        <div className="flex items-start gap-4">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="" className="h-16 w-16 rounded-2xl border-2 border-black object-cover" />
          ) : null}
          <div>
            <h1 className="text-3xl font-black tracking-tight">{business.name}</h1>
            {categories.length > 0 ? <p className="mt-1 text-sm font-bold text-[#5B21B6]">{categories.join(" · ")}</p> : null}
            {location?.locality?.name ? (
              <p className="mt-1 text-sm font-semibold text-black/65">{location.locality.name}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={bookingPath}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-[#7C3AED] px-4 text-sm font-black text-white shadow-[2px_2px_0_#000]"
          >
            Reservar
          </Link>
        </div>

        <section className="mt-10 rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#000]">
          <h2 className="mb-4 text-xl font-black">Opiniones verificadas</h2>
          <RatingSummary stats={summary} />
        </section>

        <section className="mt-8 space-y-4">
          {reviews.items.length === 0 ? null : reviews.items.map((review) => (
            <ReviewCard key={review.id} review={review} businessName={business.name} />
          ))}
        </section>
      </section>
    </LandingLayout>
  );
}
