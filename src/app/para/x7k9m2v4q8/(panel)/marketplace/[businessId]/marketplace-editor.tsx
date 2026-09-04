"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMarketplaceListingAction } from "@/server/actions/marketplace-admin.actions";
import {
  MARKETPLACE_EXCLUDED_SLUGS,
  bookableServiceNamesForLocation,
  isMarketplaceSubscriptionActive,
  marketplacePublishBlockers,
  type MarketplacePublishReadinessInput,
} from "@/lib/marketplace";

type EditorLocation = { id: string; name: string; slug: string; isActive: boolean; isPrimary: boolean };
type EditorListing = {
  locationId: string;
  localityId: string;
  categoryIds: string[];
  authorizationConfirmed: boolean;
  published: boolean;
};

export function MarketplaceEditor({
  business,
  categories,
  localities,
}: {
  business: {
    id: string;
    name: string;
    slug: string;
    deleted: boolean;
    plan: string;
    status: string;
    locations: EditorLocation[];
    listings: EditorListing[];
    services: Array<{ name: string; bookingMode: string; locationIds: string[] }>;
  };
  categories: Array<{ id: string; slug: string; name: string; isActive: boolean }>;
  localities: Array<{ id: string; slug: string; name: string; regionName: string }>;
}) {
  const [locationId, setLocationId] = useState(business.locations[0]?.id ?? "");
  const current = business.listings.find((listing) => listing.locationId === locationId);
  const [localityId, setLocalityId] = useState(current?.localityId ?? localities[0]?.id ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(current?.categoryIds ?? []);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(
    current?.authorizationConfirmed ?? false,
  );
  const [published, setPublished] = useState(current?.published ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadLocation(nextLocationId: string) {
    const listing = business.listings.find((item) => item.locationId === nextLocationId);
    setLocationId(nextLocationId);
    setLocalityId(listing?.localityId ?? localities[0]?.id ?? "");
    setCategoryIds(listing?.categoryIds ?? []);
    setAuthorizationConfirmed(listing?.authorizationConfirmed ?? false);
    setPublished(listing?.published ?? false);
    setMessage(null);
  }

  const location = business.locations.find((item) => item.id === locationId);
  const activeCategories = categories.filter((category) => category.isActive);
  const serviceNames = bookableServiceNamesForLocation({
    locationId,
    services: business.services,
  });

  const readiness: MarketplacePublishReadinessInput = {
    authorizationConfirmed,
    hasActiveCategory: categoryIds.some((id) => activeCategories.some((category) => category.id === id)),
    hasCanonicalLocality: Boolean(localityId),
    deleted: business.deleted,
    demo: MARKETPLACE_EXCLUDED_SLUGS.has(business.slug),
    slug: business.slug,
    plan: business.plan,
    subscriptionActive: isMarketplaceSubscriptionActive(business.status),
    locationActive: Boolean(location?.isActive),
    hasBookableService: serviceNames.length > 0,
  };
  const blockers = marketplacePublishBlockers(readiness);

  const localitiesByRegion = useMemo(() => {
    const groups = new Map<string, typeof localities>();
    for (const locality of localities) {
      const bucket = groups.get(locality.regionName) ?? [];
      bucket.push(locality);
      groups.set(locality.regionName, bucket);
    }
    return [...groups.entries()];
  }, [localities]);

  function toggleCategory(id: string) {
    setCategoryIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id],
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveMarketplaceListingAction({
        businessId: business.id,
        locationId,
        localityId,
        categoryIds,
        authorizationConfirmed,
        published,
      });
      setMessage(result.ok ? "Guardado." : `${result.error} ${result.blockers.join(", ")}`);
    });
  }

  if (business.locations.length === 0) {
    return (
      <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
        <h1 className="text-2xl font-black uppercase">{business.name}</h1>
        <p className="mt-3 font-bold text-black/60">
          Este negocio no tiene sucursales. Crea un local en el dashboard del negocio antes de
          publicarlo en el directorio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">{business.name}</h1>
        <p className="font-mono text-sm font-bold text-black/40">/{business.slug}</p>
        <p className="mt-2 text-sm font-bold text-black/60">
          {business.deleted ? "ELIMINADO" : `${business.plan} · ${business.status}`}
        </p>
      </div>

      <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000] space-y-5">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase">Sucursal / local</span>
          <select
            value={locationId}
            onChange={(event) => loadLocation(event.target.value)}
            className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 font-bold"
          >
            {business.locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.isActive ? "" : "(inactiva)"} {item.isPrimary ? "· principal" : ""}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-black uppercase">Categorías activas</legend>
          {activeCategories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              {category.name}
            </label>
          ))}
          <p className="text-xs font-bold text-black/50">
            Verticales futuras (inactivas):{" "}
            {categories.filter((category) => !category.isActive).map((category) => category.name).join(", ")}
          </p>
        </fieldset>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase">Ubicación canónica</span>
          <select
            value={localityId}
            onChange={(event) => setLocalityId(event.target.value)}
            className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 font-bold"
          >
            {localitiesByRegion.map(([region, items]) => (
              <optgroup key={region} label={region}>
                {items.map((locality) => (
                  <option key={locality.id} value={locality.id}>
                    {locality.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 font-bold">
          <input
            type="checkbox"
            checked={authorizationConfirmed}
            onChange={(event) => setAuthorizationConfirmed(event.target.checked)}
          />
          <span>Autorización del negocio para aparecer en el directorio confirmada</span>
        </label>

        <label className="flex items-start gap-2 font-bold">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          <span>Publicado en directorio</span>
        </label>

        <p className="text-sm font-bold text-black/60">
          Servicios reservables en esta sucursal: {serviceNames.join(", ") || "ninguno"}
        </p>
        {blockers.length > 0 ? (
          <p className="text-sm font-bold text-[#7C3AED]">
            Bloqueos de publicación: {blockers.join(", ")}
          </p>
        ) : (
          <p className="text-sm font-bold text-black/60">Listo para publicar. La indexación sigue apagada.</p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={pending || !locationId}
          className="border-2 border-black bg-[#B28DFF] px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_#000] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {message ? <p className="text-sm font-bold">{message}</p> : null}
      </div>
    </div>
  );
}
