"use client";

import { Star } from "lucide-react";

interface StampProgressProps {
  currentStamps: number;
  stampsRequired: number;
}

export function StampProgress({ currentStamps, stampsRequired }: StampProgressProps) {
  return (
    <div>
      {/* Visual stamps grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: stampsRequired }, (_, i) => {
          const isActive = i < currentStamps;
          return (
            <div
              key={i}
              className={`
                relative flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300
                ${isActive
                  ? "border-[#7C3AED]/40 bg-[#7C3AED]/20 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                  : "border-white/[0.06] bg-white/[0.02]"
                }
              `}
              style={{
                animationDelay: `${i * 60}ms`,
              }}
            >
              <Star
                className={`h-5 w-5 transition-all duration-300 ${
                  isActive
                    ? "text-[#A78BFA] fill-[#A78BFA] drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]"
                    : "text-white/10"
                }`}
              />
              {/* Stamp number */}
              <span
                className={`absolute -bottom-0.5 text-[8px] font-bold ${
                  isActive ? "text-[#A78BFA]" : "text-white/10"
                }`}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, (currentStamps / stampsRequired) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
