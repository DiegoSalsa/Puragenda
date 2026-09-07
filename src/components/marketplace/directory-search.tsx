"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "@/components/icons/hover-icons";
import { MarketplacePromptDropdown } from "@/components/marketplace/marketplace-prompt-dropdown";
import {
  MARKETPLACE_DIRECTORY_PATH,
  marketplaceCategoryDisplayName,
  marketplaceDirectoryHasFilters,
  marketplaceDirectoryHref,
  type MarketplaceDirectoryQuery,
  type MarketplaceDirectoryResult,
} from "@/lib/marketplace";
import { track } from "@/lib/analytics/client";

const FILTER_CLASS = "w-full min-[640px]:min-w-[16rem] min-[640px]:w-auto min-[640px]:flex-1";

export function DirectorySearch({
  result,
}: {
  result: MarketplaceDirectoryResult;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(result.query.q ?? "");
  const hasInventory = result.emptyKind !== "no_inventory" || result.categories.length > 0;
  const hasFilters = marketplaceDirectoryHasFilters(result.query);
  const categoryGroups = useMemo(
    () => [{
      options: result.categories.map((item) => ({
        value: item.slug,
        label: marketplaceCategoryDisplayName(item.slug, item.name),
      })),
    }],
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
  const selectedCategory = result.categories.find((item) => item.slug === result.query.categoria);
  const selectedLocality = result.localities.find((item) => item.slug === result.query.comuna);

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
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ ...result.query, q: query.trim() || undefined }, "directory_search");
      }}
    >
      {result.query.categoria ? <input type="hidden" name="categoria" value={result.query.categoria} /> : null}
      {result.query.comuna ? <input type="hidden" name="comuna" value={result.query.comuna} /> : null}
      {result.query.region ? <input type="hidden" name="region" value={result.query.region} /> : null}

      <div className="flex min-h-12 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0_#000] focus-within:ring-4 focus-within:ring-[#7C3AED]/35">
        <label className="flex min-w-0 flex-1 items-center">
          <span className="sr-only">Buscar negocio, rubro o comuna</span>
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca por nombre, rubro o comuna"
            className="min-h-12 w-full bg-transparent px-4 text-base font-semibold outline-none placeholder:text-black/40"
          />
        </label>
        <button
          type="submit"
          aria-label="Buscar"
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 bg-[#7C3AED] px-4 text-sm font-black text-white hover:bg-[#6D28D9]"
        >
          <Search className="h-5 w-5" />
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </div>

      {hasInventory && (result.categories.length > 0 || result.localities.length > 0) ? (
        <div className="flex flex-wrap gap-2">
          {result.categories.length > 0 ? (
            <MarketplacePromptDropdown
              id="directory-category"
              label="Rubro"
              value={result.query.categoria ?? ""}
              placeholder="Todos los rubros"
              groups={[{ options: [{ value: "", label: "Todos los rubros" }, ...categoryGroups[0].options] }]}
              onChange={(value) => navigate({ ...result.query, q: query.trim() || undefined, categoria: value || undefined }, "directory_filter")}
              tone="category"
              className={FILTER_CLASS}
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
              searchable
              searchPlaceholder="Buscar comuna"
              noResultsLabel="No encontramos esa comuna"
              className={FILTER_CLASS}
            />
          ) : null}
          {showRegion ? (
            <MarketplacePromptDropdown
              id="directory-region"
              label="Región"
              value={result.query.region ?? ""}
              placeholder="Todas las regiones"
              groups={[{
                options: [
                  { value: "", label: "Todas las regiones" },
                  ...result.regions.map((region) => ({ value: region, label: region })),
                ],
              }]}
              onChange={(value) => navigate({ ...result.query, q: query.trim() || undefined, region: value || undefined }, "directory_filter")}
              tone="region"
              className={FILTER_CLASS}
            />
          ) : null}
        </div>
      ) : null}

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {result.query.q ? (
            <FilterChip
              label={result.query.q}
              ariaLabel={`Quitar búsqueda ${result.query.q}`}
              onRemove={() => {
                setQuery("");
                navigate({ ...result.query, q: undefined }, "directory_filter");
              }}
            />
          ) : null}
          {selectedCategory ? (
            <FilterChip
              label={marketplaceCategoryDisplayName(selectedCategory.slug, selectedCategory.name)}
              ariaLabel={`Quitar rubro ${selectedCategory.name}`}
              onRemove={() => navigate({ ...result.query, categoria: undefined }, "directory_filter")}
            />
          ) : null}
          {selectedLocality ? (
            <FilterChip
              label={selectedLocality.name}
              ariaLabel={`Quitar comuna ${selectedLocality.name}`}
              onRemove={() => navigate({ ...result.query, comuna: undefined }, "directory_filter")}
            />
          ) : null}
          {result.query.region ? (
            <FilterChip
              label={result.query.region}
              ariaLabel={`Quitar región ${result.query.region}`}
              onRemove={() => navigate({ ...result.query, region: undefined }, "directory_filter")}
            />
          ) : null}
          <Link
            href={MARKETPLACE_DIRECTORY_PATH}
            className="text-sm font-bold text-[#5B21B6] underline underline-offset-4"
          >
            Limpiar filtros
          </Link>
        </div>
      ) : null}
    </form>
  );
}

function FilterChip({
  label,
  ariaLabel,
  onRemove,
}: {
  label: string;
  ariaLabel: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onRemove}
      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-black bg-[#FFF5BA] px-2.5 text-xs font-bold"
    >
      {label}
      <span aria-hidden="true">×</span>
    </button>
  );
}
