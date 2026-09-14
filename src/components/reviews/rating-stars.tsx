"use client";

type RatingStarsProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  name?: string;
  onChange?: (value: number) => void;
  labelledBy?: string;
  label?: string;
};

const SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

function StarGlyph({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.2 14.7 9l6.3.7-4.7 4.3 1.3 6.3L12 17.4 6.4 20.3 7.7 14 3 9.7 9.3 9 12 3.2Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RatingStars({
  value,
  max = 5,
  size = "md",
  interactive = false,
  name = "rating",
  onChange,
  labelledBy,
  label,
}: RatingStarsProps) {
  const stars = Array.from({ length: max }, (_, index) => index + 1);
  const accessibleLabel = label ?? `${value} de ${max} estrellas`;

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={accessibleLabel} title={accessibleLabel}>
        {stars.map((star) => (
          <StarGlyph
            key={star}
            filled={star <= value}
            className={`${SIZE[size]} ${star <= value ? "text-[#F59E0B]" : "text-black/25 dark:text-white/30"}`}
          />
        ))}
        <span className="sr-only">{accessibleLabel}</span>
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
              <StarGlyph
                filled={filled}
                className={`${SIZE[size]} ${filled ? "text-[#F59E0B]" : "text-black/25"}`}
              />
              <span className="sr-only">{star} {star === 1 ? "estrella" : "estrellas"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
