"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarketplacePromptDropdown } from "@/components/marketplace/marketplace-prompt-dropdown";
import {
  MARKETPLACE_DIRECTORY_PATH,
  marketplaceDirectoryHref,
  type MarketplaceDirectoryQuery,
  type MarketplaceDirectoryResult,
} from "@/lib/marketplace";
import { track } from "@/lib/analytics/client";

export function DirectorySearch({
  result,
}: {
  result: MarketplaceDirectoryResult;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(result.query.q ?? "");
  const categoryGroups = useMemo(
    () => [{ options: result.categories.map((item) => ({ value: item.slug, label: item.name })) }],
    [result.categories],
  );
  const localityGroups = useMemo(() => {
    const byRegion = new Map<string, Array<{ value: string; label: string }>>();
    for (const locality of result.localities) {
      const region = locality.regionName || "Chile";
      const bucket = byRegion.get(region) ?? [];
      bucket.push({ value: locality.slug, label: locality.name });
      byRegion.set(region, bucket);
    }
    return [...byRegion.entries()].map(([label, options]) => ({ label, options }));
  }, [result.localities]);
  const showRegion = result.regions.length > 1;

  function navigate(next: MarketplaceDirectoryQuery, eventName?: "directory_search" | "directory_filter") {
    if (eventName === "directory_search") {
      track("directory_search", { has_query: Boolean(next.q) });
    }
    if (eventName === "directory_filter") {
      track("directory_filter", {
        has_category: Boolean(next.categoria),
        has_locality: Boolean(next.comuna || next.region),
      });
    }
    router.push(marketplaceDirectoryHref(next));
  }

  return (
    <form
      action={MARKETPLACE_DIRECTORY_PATH}
      method="get"
      className="mt-6 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ ...result.query, q: query.trim() || undefined }, "directory_search");
      }}
    >
      {result.query.categoria ? <input type="hidden" name="categoria" value={result.query.categoria} /> : null}
      {result.query.comuna ? <input type="hidden" name="comuna" value={result.query.comuna} /> : null}
      {result.query.region ? <input type="hidden" name="region" value={result.query.region} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Buscar negocio, rubro o comuna</span>
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca por nombre, rubro o comuna"
            className="min-h-12 w-full rounded-2xl border-4 border-black bg-white px-4 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 border-4 border-black bg-[#7C3AED] px-5 text-sm font-black uppercase text-white shadow-[4px_4px_0_#000]"
        >
          Buscar
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {result.categories.length > 0 ? (
          <MarketplacePromptDropdown
            id="directory-category"
            label="Rubro"
            value={result.query.categoria ?? ""}
            placeholder="Todos los rubros"
            groups={[{ options: [{ value: "", label: "Todos los rubros" }, ...categoryGroups[0].options] }]}
            onChange={(value) => navigate({ ...result.query, q: query.trim() || undefined, categoria: value || undefined }, "directory_filter")}
            tone="category"
          />
        ) : null}
        {result.localities.length > 0 ? (
          <MarketplacePromptDropdown
            id="directory-locality"
            label="Comuna"
            value={result.query.comuna ?? ""}
            placeholder="Todas las comunas"
            groups={[
              { options: [{ value: "", label: "Todas las comunas" }] },
              ...localityGroups,
            ]}
            onChange={(value) => navigate({ ...result.query, q: query.trim() || undefined, comuna: value || undefined }, "directory_filter")}
            tone="locality"
            searchable={result.localities.length > 8}
            searchPlaceholder="Buscar comuna"
            noResultsLabel="No encontramos esa comuna"
          />
        ) : null}
        {showRegion ? (
          <label className="block min-w-0 sm:min-w-48">
            <span className="sr-only">Región</span>
            <select
              name="region"
              value={result.query.region ?? ""}
              onChange={(event) => navigate({ ...result.query, q: query.trim() || undefined, region: event.target.value || undefined }, "directory_filter")}
              className="min-h-12 w-full rounded-2xl border-4 border-black bg-white px-3 text-sm font-bold"
            >
              <option value="">Todas las regiones</option>
              {result.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </form>
  );
}
