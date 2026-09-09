/* Tenant-hosted branding URLs are intentionally rendered without a Next.js host allowlist. */
/* eslint-disable @next/next/no-img-element */

import { Gift, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export type GiftCardVisualService = {
  name: string;
  quantity?: number;
};

type GiftCardVisualProps = {
  businessName: string;
  logoUrl?: string | null;
  giftCardName: string;
  type: "BALANCE" | "SERVICE";
  faceValue?: number | null;
  services?: GiftCardVisualService[];
  shortMessage?: string | null;
  background: string;
  accent: string;
  text: string;
  imageUrl?: string | null;
  currencyCode: string;
  compact?: boolean;
  className?: string;
};

export function GiftCardVisual({
  businessName,
  logoUrl,
  giftCardName,
  type,
  faceValue,
  services = [],
  shortMessage,
  background,
  accent,
  text,
  imageUrl,
  currencyCode,
  compact = false,
  className = "",
}: GiftCardVisualProps) {
  const visibleServices = services.slice(0, compact ? 2 : 3);
  const remainingServices = services.length - visibleServices.length;

  return (
    <div
      className={`relative isolate aspect-[1.55/1] w-full overflow-hidden rounded-[1.4rem] border-[3px] border-black shadow-[6px_6px_0_#000] ${className}`}
      style={{ backgroundColor: background, color: text }}
      aria-label={`${giftCardName || "Gift Card"} · ${businessName}`}
    >
      {imageUrl && (
        <div className="absolute inset-y-0 right-0 -z-10 w-[38%] border-l-[3px] border-black bg-white/20">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`absolute ${compact ? "-bottom-5 -right-4 h-20 w-20" : "-bottom-10 -right-8 h-36 w-36"} rounded-full border-[3px] border-black`} style={{ backgroundColor: accent }} />
      <div className={`relative flex h-full flex-col ${compact ? "p-3.5" : "p-5 sm:p-6"}`}>
        <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
          {logoUrl ? (
            <img src={logoUrl} alt="" className={`${compact ? "h-7 w-7 rounded-lg" : "h-10 w-10 rounded-xl"} border-2 border-black bg-white object-cover`} />
          ) : (
            <span className={`${compact ? "h-7 w-7 rounded-lg" : "h-10 w-10 rounded-xl"} inline-flex items-center justify-center border-2 border-black bg-white text-black`}>
              <Gift className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
          )}
          <p className={`${compact ? "text-[9px]" : "text-xs"} max-w-[65%] truncate font-black uppercase tracking-[0.16em]`}>{businessName}</p>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col justify-center ${imageUrl ? "pr-[34%]" : "pr-3"}`}>
          <p className={`${compact ? "line-clamp-1 text-base" : "line-clamp-2 text-xl sm:text-2xl"} font-black leading-tight`}>{giftCardName || "Un regalo para ti"}</p>
          {shortMessage && <p className={`${compact ? "mt-1 line-clamp-1 text-[9px]" : "mt-2 line-clamp-2 text-xs sm:text-sm"} font-bold opacity-75`}>{shortMessage}</p>}

          {type === "BALANCE" ? (
            <p className={`${compact ? "mt-2 text-xl" : "mt-4 text-3xl sm:text-4xl"} font-black tracking-tight`}>{formatPrice(faceValue || 0, currencyCode)}</p>
          ) : (
            <ul className={`${compact ? "mt-2 space-y-0 text-[10px]" : "mt-4 space-y-1 text-xs sm:text-sm"} font-black`}>
              {visibleServices.length > 0 ? visibleServices.map((service, index) => (
                <li key={`${service.name}-${index}`} className="flex min-w-0 items-center gap-1.5">
                  <Sparkles className={`${compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} shrink-0`} />
                  <span className="truncate">{service.name}{(service.quantity || 1) > 1 ? ` × ${service.quantity}` : ""}</span>
                </li>
              )) : <li className="opacity-60">Elige los servicios incluidos</li>}
              {remainingServices > 0 && <li className="opacity-65">+{remainingServices} más</li>}
            </ul>
          )}
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <span className={compact ? "h-4 w-4" : "h-5 w-5"} />
          <span className={`${compact ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[10px]"} rounded-full border-2 border-black bg-white font-black uppercase tracking-[0.18em] text-black`}>Gift Card</span>
        </div>
      </div>
    </div>
  );
}
