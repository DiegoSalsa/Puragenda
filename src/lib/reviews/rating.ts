import {
  REVIEW_COMPARISON_MIN_SAMPLE,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
} from "./constants";

export type PublicRatingStats = {
  count: number;
  sum: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export const EMPTY_RATING_DISTRIBUTION: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export function isValidReviewRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= REVIEW_MIN_RATING && value <= REVIEW_MAX_RATING;
}

export function averageFromSum(sum: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

export function formatRatingAverage(average: number | null, locale = "es"): string | null {
  if (average == null) return null;
  return average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function positiveShare(count4: number, count5: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round(((count4 + count5) / total) * 100);
}

export function honestAverageDelta(current: number | null, previous: number | null, previousCount: number): number | null {
  if (current == null || previous == null) return null;
  if (previousCount < REVIEW_COMPARISON_MIN_SAMPLE) return null;
  return Math.round((current - previous) * 10) / 10;
}

export function buildPublicRatingStats(input: {
  count: number;
  sum: number;
  distribution?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
}): PublicRatingStats {
  const count = Math.max(0, input.count);
  const sum = Math.max(0, input.sum);
  return {
    count,
    sum,
    average: averageFromSum(sum, count),
    distribution: {
      ...EMPTY_RATING_DISTRIBUTION,
      ...input.distribution,
    },
  };
}

export const PUBLIC_REVIEW_WHERE = {
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
  withdrawnAt: null,
};

export function isCountablePublicReview(review: {
  visibility: string;
  status: string;
  withdrawnAt?: Date | string | null;
}): boolean {
  return (
    review.visibility === "PUBLIC"
    && review.status === "PUBLISHED"
    && review.withdrawnAt == null
  );
}
