"use client";

import { Star } from "@/components/icons/hover-icons";

type RatingStarsProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  name?: string;
  onChange?: (value: number) => void;
  labelledBy?: string;
};

const SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function RatingStars({
  value,
  max = 5,
  size = "md",
  interactive = false,
  name = "rating",
  onChange,
  labelledBy,
}: RatingStarsProps) {
  const stars = Array.from({ length: max }, (_, index) => index + 1);
  const label = `${value} de ${max} estrellas`;

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={label} title={label}>
        {stars.map((star) => (
          <Star
            key={star}
            className={`${SIZE[size]} ${star <= value ? "text-[#F59E0B]" : "text-black/20 dark:text-white/25"}`}
            fill={star <= value ? "currentColor" : "none"}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <fieldset className="m-0 border-0 p-0" aria-labelledby={labelledBy}>
      <legend className="sr-only">Puntuación de 1 a 5 estrellas</legend>
      <div className="flex items-center gap-1">
        {stars.map((star) => {
          const checked = value === star;
          const filled = star <= value;
          return (
            <label
              key={star}
              className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-4 focus-within:ring-[#7C3AED]/40"
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={star}
                checked={checked}
                onChange={() => onChange?.(star)}
              />
              <Star
                className={`${SIZE[size]} ${filled ? "text-[#F59E0B]" : "text-black/25"}`}
                fill={filled ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span className="sr-only">{star} {star === 1 ? "estrella" : "estrellas"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
