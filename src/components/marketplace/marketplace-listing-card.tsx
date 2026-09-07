"use client";

import Link from "next/link";
import { track } from "@/lib/analytics/client";

type MarketplaceListingCardProps = {
  name: string;
  bookingPath: string;
  cityName: string;
  categoryNames?: string[];
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
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#B28DFF] text-lg font-black text-black"
    >
      {letter}
    </div>
  );
}

export function MarketplaceListingCard({
  name,
  bookingPath,
  cityName,
  categoryNames = [],
  locationName,
  logoUrl,
  serviceNames,
  ctaLabel = "Reservar",
  trackBooking = false,
}: MarketplaceListingCardProps) {
  const showLocation = Boolean(locationName && locationName !== name);
  const rubro = categoryNames.filter(Boolean).join(" · ");

  return (
    <article className="flex h-full flex-col rounded-2xl border-4 border-black bg-white p-4 text-black shadow-[4px_4px_0_#000] dark:border-white dark:bg-black dark:text-white">
      <div className="flex items-start gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl border-2 border-black object-cover"
          />
        ) : (
          <LogoFallback name={name} />
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-black leading-tight">{name}</h3>
          {rubro ? <p className="mt-1 text-sm font-bold text-[#5B21B6] dark:text-[#C4B5FD]">{rubro}</p> : null}
          <p className="mt-1 text-sm font-bold opacity-70">
            {cityName}
            {showLocation ? ` · ${locationName}` : ""}
          </p>
        </div>
      </div>
      {serviceNames.length > 0 ? (
        <p className="mt-3 text-sm font-bold opacity-80">{serviceNames.join(" · ")}</p>
      ) : null}
      <Link
        href={bookingPath}
        onClick={() => {
          if (trackBooking) track("directory_booking_clicked", { placement: "card" });
        }}
        className="mt-4 inline-flex min-h-11 w-fit items-center justify-center border-2 border-black bg-[#7C3AED] px-4 py-2 text-sm font-black uppercase text-white shadow-[3px_3px_0_#000] hover:bg-[#6D28D9]"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
