import { formatRatingAverage } from "@/lib/reviews/rating";
import { RatingStars } from "./rating-stars";

export function CompactRating({
  average,
  count,
  href,
  suffix = "count",
}: {
  average: number | null;
  count: number;
  href?: string;
  suffix?: "count" | "opinions";
}) {
  const formatted = formatRatingAverage(average);
  if (!formatted || count <= 0 || average == null) return null;

  const countLabel = suffix === "opinions"
    ? `· ${count} ${count === 1 ? "opinión" : "opiniones"}`
    : `(${count})`;

  const content = (
    <>
      <RatingStars value={Math.round(average)} size="sm" label={`${formatted} de 5 estrellas`} />
      <span className="tabular-nums">{formatted}</span>
      <span className="font-semibold text-black/55 dark:text-white/60">{countLabel}</span>
    </>
  );

  const className = "inline-flex max-w-full items-center gap-1.5 text-sm font-black";
  if (href) {
    return (
      <a href={href} className={`${className} rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7C3AED]/40`}>
        {content}
      </a>
    );
  }
  return <p className={className}>{content}</p>;
}
