import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RatingStars } from "./rating-stars";
import { VerifiedBookingBadge } from "./verified-booking-badge";

export type PublicReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  publicReviewerName: string;
  serviceNameSnapshot?: string | null;
  publishedAt: Date | string | null;
  submittedAt: Date | string;
  businessReply: string | null;
  businessRepliedAt?: Date | string | null;
};

export function ReviewCard({
  review,
  businessName,
}: {
  review: PublicReviewItem;
  businessName: string;
}) {
  const date = review.publishedAt ?? review.submittedAt;
  const when = formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });

  return (
    <article className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#000] dark:border-white dark:bg-black">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RatingStars value={review.rating} size="sm" />
        <time className="text-xs font-bold text-black/50 dark:text-white/50" dateTime={new Date(date).toISOString()}>
          {when}
        </time>
      </div>
      <p className="mt-2 text-sm font-black">{review.publicReviewerName}</p>
      <VerifiedBookingBadge compact />
      {review.serviceNameSnapshot ? (
        <p className="mt-1 text-xs font-semibold text-black/55 dark:text-white/60">{review.serviceNameSnapshot}</p>
      ) : null}
      {review.comment ? (
        <p className="mt-3 max-w-prose text-sm font-medium leading-6">“{review.comment}”</p>
      ) : null}
      {review.businessReply ? (
        <div className="mt-4 max-w-prose rounded-xl border border-black/15 bg-[#FFFAEB] p-3 dark:border-white/20 dark:bg-white/5">
          <p className="text-xs font-bold text-black/55 dark:text-white/60">Respuesta de {businessName}</p>
          <p className="mt-1 text-sm font-medium leading-6">{review.businessReply}</p>
        </div>
      ) : null}
    </article>
  );
}
