"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMarketplaceListingAction } from "@/server/actions/marketplace-admin.actions";
import {
  MARKETPLACE_EXCLUDED_SLUGS,
  MARKETPLACE_LISTING_STATUSES,
  bookableServiceNamesForLocation,
  groupLocalitiesByRegion,
  marketplaceListingStatusLabel,
  marketplacePublishBlockerLabel,
  marketplacePublishBlockers,
  type MarketplaceListingStatus,
  type MarketplacePublishReadinessInput,
} from "@/lib/marketplace";

type EditorLocation = { id: string; name: string; slug: string; isActive: boolean; isPrimary: boolean };
type EditorListing = {
  locationId: string;
  localityId: string | null;
  status: MarketplaceListingStatus;
  categoryIds: string[];
  authorizationConfirmed: boolean;
  authorizationSource: string | null;
  authorizationConfirmedAt: string | null;
  authorizationRevokedAt: string | null;
  authorizationTextVersion: string | null;
  pendingCategoryDescription: string | null;
  pendingLocalityName: string | null;
  published: boolean;
};

const CHECKLIST: Array<{
  ok: (input: MarketplacePublishReadinessInput) => boolean;
  label: string;
}> = [
  { ok: (input) => input.status === "ACTIVE", label: "Estado marketplace Activo" },
  { ok: (input) => input.authorizationConfirmed, label: "Autorización vigente" },
  { ok: (input) => input.hasActiveCategory, label: "Categoría asignada" },
  { ok: (input) => input.hasCanonicalLocality, label: "Localidad canónica" },
  { ok: (input) => !input.deleted, label: "Negocio no eliminado" },
  { ok: (input) => input.locationActive, label: "Sucursal activa" },
  { ok: (input) => !input.demo && input.plan !== "TEST", label: "No es demo ni plan TEST" },
  { ok: (input) => input.hasBookableService, label: "Servicio reservable" },
];

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
  categories: Array<{ id: string; slug: string; name: string; isActive: boolean; seoEnabled: boolean }>;
  localities: Array<{ id: string; slug: string; name: string; regionName: string }>;
}) {
  const [locationId, setLocationId] = useState(business.locations[0]?.id ?? "");
  const current = business.listings.find((listing) => listing.locationId === locationId);
  const [localityId, setLocalityId] = useState(current?.localityId ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(current?.categoryIds ?? []);
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceListingStatus>(
    current?.status ?? "PENDING_REVIEW",
  );
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(
    current?.authorizationConfirmed ?? false,
  );
  const [published, setPublished] = useState(current?.published ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadLocation(nextLocationId: string) {
    const listing = business.listings.find((item) => item.locationId === nextLocationId);
    setLocationId(nextLocationId);
    setLocalityId(listing?.localityId ?? "");
    setCategoryIds(listing?.categoryIds ?? []);
    setMarketplaceStatus(listing?.status ?? "PENDING_REVIEW");
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
    status: marketplaceStatus,
    authorizationConfirmed,
    hasActiveCategory: categoryIds.some((id) => activeCategories.some((category) => category.id === id)),
    hasCanonicalLocality: Boolean(localityId),
    deleted: business.deleted,
    demo: MARKETPLACE_EXCLUDED_SLUGS.has(business.slug),
    slug: business.slug,
    plan: business.plan,
    locationActive: Boolean(location?.isActive),
    hasBookableService: serviceNames.length > 0,
  };
  const blockers = marketplacePublishBlockers(readiness);

  const localitiesByRegion = useMemo(() => groupLocalitiesByRegion(localities), [localities]);

  function toggleCategory(id: string) {
    setCategoryIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id],
    );
  }

  function changeStatus(next: MarketplaceListingStatus) {
    setMarketplaceStatus(next);
    if (next !== "ACTIVE") setPublished(false);
  }

  function save() {
    startTransition(async () => {
      const result = await saveMarketplaceListingAction({
        businessId: business.id,
        locationId,
        localityId: localityId || null,
        categoryIds,
        status: marketplaceStatus,
        authorizationConfirmed,
        published,
      });
      if (result.ok) {
        setMessage("Guardado.");
        return;
      }
      const labels = result.blockers.map(marketplacePublishBlockerLabel).join(" · ");
      setMessage(labels ? `${result.error} ${labels}` : result.error);
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
          Cuenta: {business.deleted ? "ELIMINADO" : `${business.plan} · ${business.status}`}
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

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase">Estado marketplace</span>
          <select
            value={marketplaceStatus}
            onChange={(event) => changeStatus(event.target.value as MarketplaceListingStatus)}
            className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 font-bold"
          >
            {MARKETPLACE_LISTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {marketplaceListingStatusLabel(status)}
              </option>
            ))}
          </select>
          <p className="text-xs font-bold text-black/50">
            Independiente de la cuenta/suscripción. Pausar o excluir despublica. Reactivar no vuelve a
            publicar solo.
          </p>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-black uppercase">Categorías para clasificar</legend>
          {activeCategories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              {category.name}
              {category.seoEnabled ? "" : " · sin ruta SEO"}
            </label>
          ))}
          <p className="text-xs font-bold text-black/50">
            Clasificar no publica ni indexa. Solo barberías y peluquerías tienen rutas SEO, y siguen noindex.
            Verticales aún no asignables:{" "}
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
            <option value="">Pendiente de normalización</option>
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
          {current?.pendingLocalityName ? (
            <p className="text-xs font-bold text-black/50">
              Localidad pendiente informada en registro: {current.pendingLocalityName}
            </p>
          ) : null}
        </label>

        {current?.pendingCategoryDescription ? (
          <p className="text-sm font-bold text-black/60">
            Rubro “Otro” pendiente de revisión: {current.pendingCategoryDescription}
          </p>
        ) : null}

        <label className="flex items-start gap-2 font-bold">
          <input
            type="checkbox"
            checked={authorizationConfirmed}
            onChange={(event) => setAuthorizationConfirmed(event.target.checked)}
          />
          <span>Autorización del negocio para aparecer en el directorio confirmada</span>
        </label>
        {current ? (
          <p className="text-xs font-bold text-black/50">
            Fuente: {current.authorizationSource || "—"}
            {current.authorizationConfirmedAt ? ` · ${new Date(current.authorizationConfirmedAt).toLocaleString("es-CL")}` : ""}
            {current.authorizationTextVersion ? ` · texto ${current.authorizationTextVersion}` : ""}
            {current.authorizationRevokedAt ? ` · revocada ${new Date(current.authorizationRevokedAt).toLocaleString("es-CL")}` : ""}
          </p>
        ) : null}

        <label className="flex items-start gap-2 font-bold">
          <input
            type="checkbox"
            checked={published}
            disabled={marketplaceStatus !== "ACTIVE"}
            onChange={(event) => setPublished(event.target.checked)}
          />
          <span>Publicado en directorio</span>
        </label>

        <p className="text-sm font-bold text-black/60">
          Servicios reservables en esta sucursal: {serviceNames.join(", ") || "ninguno"}
        </p>

        <section aria-label="Elegibilidad de publicación" className="border-2 border-black bg-[#FFFAEB] p-4">
          <h2 className="text-xs font-black uppercase">Checklist de publicación</h2>
          <ul className="mt-3 space-y-1 text-sm font-bold">
            {CHECKLIST.map((item) => {
              const ok = item.ok(readiness);
              return (
                <li key={item.label} className={ok ? "text-black/70" : "text-[#7C3AED]"}>
                  {ok ? "✓" : "✕"} {item.label}
                </li>
              );
            })}
          </ul>
          {blockers.length > 0 ? (
            <p className="mt-3 text-sm font-bold text-[#7C3AED]">
              Bloqueos: {blockers.map(marketplacePublishBlockerLabel).join(" · ")}
            </p>
          ) : (
            <p className="mt-3 text-sm font-bold text-black/60">
              Listo para publicar. La indexación sigue apagada.
            </p>
          )}
        </section>

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
