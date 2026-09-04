"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MarketplaceQualityGateReportRow } from "@/lib/marketplace";

type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  deleted: boolean;
  plan: string;
  status: string;
  listings: Array<{
    published: boolean;
    authorized: boolean;
    locality: string;
    location: string;
    locationActive: boolean;
    categories: string[];
  }>;
};

export function MarketplaceClient({
  adminPath,
  indexingEnabled,
  minPublicBusinesses,
  minBookableServices,
  report,
  businesses,
}: {
  adminPath: string;
  indexingEnabled: boolean;
  minPublicBusinesses: number;
  minBookableServices: number;
  report: MarketplaceQualityGateReportRow[];
  businesses: AdminBusiness[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return businesses;
    return businesses.filter((business) =>
      `${business.name} ${business.slug} ${business.listings.map((listing) => listing.locality).join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [businesses, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">Marketplace</h1>
        <p className="mt-2 max-w-3xl text-sm font-bold text-black/60">
          Inventario curado. Un negocio no aparece en el directorio hasta que hay autorización,
          categoría, localidad canónica y publicación explícita. La indexación sigue apagada.
        </p>
      </div>

      <section className="border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
        <h2 className="text-xs font-black uppercase tracking-wider text-black">Quality gate</h2>
        <p className="mt-2 text-sm font-bold text-black/60">
          indexingEnabled: {indexingEnabled ? "true" : "false"} · piso {minPublicBusinesses} listings /{" "}
          {minBookableServices} servicios
        </p>
        {report.length === 0 ? (
          <p className="mt-4 text-sm font-bold text-black/50">Todavía no hay listings publicados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-black text-xs font-black uppercase">
                  <th className="py-2">Categoría</th>
                  <th>Localidad</th>
                  <th>Listings</th>
                  <th>Negocios</th>
                  <th>Servicios</th>
                  <th>Piso</th>
                  <th>Indexable ahora</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={`${row.categorySlug}-${row.citySlug}`} className="border-b border-black/10">
                    <td className="py-2 font-bold">{row.categorySlug}</td>
                    <td className="font-bold">{row.citySlug}</td>
                    <td>{row.publishedListings}</td>
                    <td>{row.distinctBusinesses}</td>
                    <td>{row.bookableServices}</td>
                    <td className="font-black">{row.meetsInventoryFloor ? "SÍ" : "NO"}</td>
                    <td className="font-black">{row.wouldPassCurrentGate ? "SÍ" : "NO"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-black">Negocios</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nombre o slug"
            className="w-full border-2 border-black bg-[#FFFAEB] px-3 py-2 text-sm font-bold outline-none sm:w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black text-xs font-black uppercase">
                <th className="py-2">Nombre</th>
                <th>Estado</th>
                <th>Categorías</th>
                <th>Ubicación</th>
                <th>Publicado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((business) => {
                const published = business.listings.filter((listing) => listing.published);
                return (
                  <tr key={business.id} className="border-b border-black/10">
                    <td className="py-3">
                      <Link
                        href={`${adminPath}/marketplace/${business.id}`}
                        className="font-black uppercase underline decoration-2 underline-offset-2"
                      >
                        {business.name}
                      </Link>
                      <p className="font-mono text-xs text-black/40">/{business.slug}</p>
                    </td>
                    <td className="font-bold">
                      {business.deleted ? "ELIMINADO" : `${business.plan} · ${business.status}`}
                    </td>
                    <td className="font-bold">
                      {published.flatMap((listing) => listing.categories).join(", ") || "—"}
                    </td>
                    <td className="font-bold">
                      {published.map((listing) => listing.locality).join(", ") || "—"}
                    </td>
                    <td className="font-black">{published.length > 0 ? "SÍ" : "NO"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
