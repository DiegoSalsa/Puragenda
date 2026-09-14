import { formatRatingAverage, type PublicRatingStats } from "@/lib/reviews/rating";
import { RatingStars } from "./rating-stars";

export function RatingSummary({
  stats,
  emptyLabel = "Este negocio todavía no tiene opiniones verificadas en Puragenda.",
}: {
  stats: PublicRatingStats;
  emptyLabel?: string;
}) {
  if (stats.count === 0 || stats.average == null) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-black/30 bg-white px-4 py-5 text-sm font-semibold text-black/60">
        {emptyLabel}
      </div>
    );
  }

  const formatted = formatRatingAverage(stats.average);
  const max = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center sm:pr-6">
        <p className="text-5xl font-black tracking-tight">{formatted}</p>
        <div className="mt-1 flex justify-center">
          <RatingStars value={Math.round(stats.average)} label={`${formatted} de 5 estrellas`} />
        </div>
        <p className="mt-1 text-sm font-bold text-black/60">
          {stats.count} {stats.count === 1 ? "opinión" : "opiniones"}
        </p>
      </div>
      <ul className="space-y-1.5" aria-label="Distribución de estrellas">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = stats.distribution[star];
          const width = `${Math.round((count / max) * 100)}%`;
          return (
            <li key={star} className="flex items-center gap-2 text-sm font-bold">
              <span className="w-8 shrink-0 tabular-nums">{star} ★</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-black/20 bg-black/5">
                <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: count > 0 ? width : "0%" }} />
              </div>
              <span className="w-8 text-right tabular-nums text-black/60">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
