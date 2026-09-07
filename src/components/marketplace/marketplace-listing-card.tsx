"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/icons/hover-icons";
import { track } from "@/lib/analytics/client";
import {
  marketplaceCategoryDisplayName,
  marketplacePublicLocationLabel,
  marketplaceVisibleServices,
} from "@/lib/marketplace";

type MarketplaceListingCardProps = {
  name: string;
  bookingPath: string;
  cityName: string;
  categoryNames?: string[];
  categorySlugs?: string[];
  locationName?: string;
  logoUrl?: string | null;
  serviceNames: string[];
  ctaLabel?: string;
  trackBooking?: boolean;
};

function LogoFallback({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toLocaleUpperCase("es") || "P";
  return (
    <div
      aria-hidden="true"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-[#FFF5BA]"
    >
      <span className="absolute left-0 top-0 h-2 w-2 bg-[#7C3AED]" />
      <span className="text-sm font-black text-black">{letter}</span>
    </div>
  );
}

export function MarketplaceListingCard({
  name,
  bookingPath,
  cityName,
  categoryNames = [],
  categorySlugs = [],
  locationName,
  logoUrl,
  serviceNames,
  ctaLabel = "Reservar",
  trackBooking = false,
}: MarketplaceListingCardProps) {
  const publicLocation = marketplacePublicLocationLabel(locationName, name);
  const rubro = (categorySlugs.length > 0
    ? categorySlugs.map((slug, index) => marketplaceCategoryDisplayName(slug, categoryNames[index]))
    : categoryNames
  )
    .filter(Boolean)
    .filter((label, index, all) => all.indexOf(label) === index)
    .join(" · ");
  const services = marketplaceVisibleServices(serviceNames, 3);

  return (
    <Link
      href={bookingPath}
      aria-label={`${ctaLabel} en ${name}`}
      onClick={() => {
        if (trackBooking) track("directory_booking_clicked", { placement: "card" });
      }}
      className="group flex h-full flex-col rounded-2xl border-2 border-black bg-white p-3.5 text-black shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]/40 dark:border-white dark:bg-black dark:text-white"
    >
      <div className="flex items-start gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl border-2 border-black object-cover"
          />
        ) : (
          <LogoFallback name={name} />
        )}
        <div className="min-w-0">
          <h3 className="text-base font-black leading-snug">{name}</h3>
          {rubro ? <p className="mt-0.5 text-sm font-bold text-[#5B21B6] dark:text-[#C4B5FD]">{rubro}</p> : null}
          <p className="mt-0.5 text-sm font-semibold text-black/65 dark:text-white/70">
            {cityName}
            {publicLocation ? ` · ${publicLocation}` : ""}
          </p>
        </div>
      </div>
      {services.visible.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {services.visible.map((service) => (
            <li
              key={service}
              className="max-w-full truncate rounded-full border border-black/20 bg-[#FFFAEB] px-2 py-0.5 text-xs font-bold text-black/80 dark:border-white/30 dark:bg-white/10 dark:text-white/80"
            >
              {service}
            </li>
          ))}
          {services.extra > 0 ? (
            <li className="rounded-full px-2 py-0.5 text-xs font-bold text-black/55 dark:text-white/60">
              +{services.extra} {services.extra === 1 ? "servicio" : "servicios"}
            </li>
          ) : null}
        </ul>
      ) : null}
      <span className="mt-auto pt-3">
        <span className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-[#7C3AED] px-3 text-sm font-black text-white shadow-[2px_2px_0_#000] group-hover:bg-[#6D28D9] sm:w-fit">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </span>
      </span>
    </Link>
  );
}
