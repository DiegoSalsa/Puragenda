"use client";

import { useState } from "react";
import { ReviewCard, type PublicReviewItem } from "./review-card";

export function PublicReviewList({
  slug,
  businessName,
  initialItems,
  total,
  pageSize,
}: {
  slug: string;
  businessName: string;
  initialItems: PublicReviewItem[];
  total: number;
  pageSize: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMore = items.length < total;

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reviews/public?slug=${encodeURIComponent(slug)}&page=${page + 1}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("No se pudieron cargar más opiniones.");
        return;
      }
      setItems((current) => [...current, ...(data.items ?? [])]);
      setPage((current) => current + 1);
    } catch {
      setError("No se pudieron cargar más opiniones.");
    } finally {
      setLoading(false);
    }
  }

  if (total === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <ul className="space-y-4">
        {items.map((review) => (
          <li key={review.id}>
            <ReviewCard review={review} businessName={businessName} />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div>
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-white px-4 text-sm font-black shadow-[2px_2px_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]/40 disabled:opacity-60"
          >
            {loading ? "Cargando…" : "Ver más opiniones"}
          </button>
          <p className="mt-2 text-xs font-semibold text-black/50">
            Mostrando {items.length} de {total}
          </p>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      <span className="sr-only">Paginación de {pageSize} opiniones por página.</span>
    </div>
  );
}
