"use client";

import { Stamp } from "lucide-react";

interface StampProgressProps {
  currentStamps: number;
  stampsRequired: number;
}

export function StampProgress({ currentStamps, stampsRequired }: StampProgressProps) {
  const percentage = Math.min(100, (currentStamps / stampsRequired) * 100);

  return (
    <div className="space-y-5">
      {/* Visual stamps grid */}
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {Array.from({ length: stampsRequired }, (_, i) => {
          const isActive = i < currentStamps;
          const isNext = i === currentStamps;
          return (
            <div
              key={i}
              className={`
                group relative flex aspect-square items-center justify-center rounded-2xl border-2 transition-all duration-500
                ${isActive
                  ? "border-[#D4AF37]/50 bg-gradient-to-br from-[#D4AF37]/25 via-[#F5E6A3]/15 to-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.25)] scale-100"
                  : isNext
                    ? "border-[rgb(var(--color-primary)/0.4)] bg-[rgb(var(--color-primary)/0.1)] animate-pulse shadow-[0_0_12px_rgb(var(--color-primary)/0.15)]"
                    : "border-[rgb(var(--color-text)/0.06)] bg-[rgb(var(--color-text)/0.02)] hover:border-[rgb(var(--color-text)/0.1)]"
                }
              `}
              style={{ animationDelay: `${i * 80}ms`, animationDuration: isNext ? "2s" : undefined }}
            >
              {/* Sparkle effect for active stamps */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F5E6A3]/10 to-transparent opacity-60" />
              )}

              <Stamp
                className={`relative z-10 h-6 w-6 sm:h-7 sm:w-7 transition-all duration-500 ${
                  isActive
                    ? "text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                    : isNext
                      ? "text-[rgb(var(--color-primary)/0.6)]"
                      : "text-[rgb(var(--color-text)/0.08)]"
                }`}
              />

              {/* Stamp number */}
              <span
                className={`absolute bottom-1 text-[9px] font-bold tracking-tight ${
                  isActive ? "text-[#D4AF37]/80" : isNext ? "text-[rgb(var(--color-primary)/0.4)]" : "text-[rgb(var(--color-text)/0.06)]"
                }`}
              >
                {i + 1}
              </span>

              {/* Active glow ring */}
              {isActive && (
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#F5E6A3]/5 blur-sm -z-10" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[rgb(var(--color-text)/0.04)] border border-[rgb(var(--color-text)/0.06)]">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(90deg, rgb(var(--color-primary)) 0%, #D4AF37 60%, #F5E6A3 100%)",
            boxShadow: "0 0 12px rgba(212,175,55,0.4)",
          }}
        />
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgb(var(--color-text)/0.3) 50%, transparent 100%)",
            animation: "shimmer 2s infinite",
          }}
        />
      </div>
    </div>
  );
}
