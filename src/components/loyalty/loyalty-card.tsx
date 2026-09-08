import { loyaltyProgressCopy } from "@/core/loyalty";
import { LoyaltyStamp } from "./loyalty-stamp";

export function LoyaltyCard({ businessName, logoUrl, currentStamps, stampsRequired, rewardLabel, enabled = true, compact = false }: {
  businessName: string;
  logoUrl?: string | null;
  currentStamps: number;
  stampsRequired: number;
  rewardLabel: string;
  enabled?: boolean;
  compact?: boolean;
}) {
  const required = Math.max(2, Math.min(30, stampsRequired));
  const current = Math.max(0, Math.min(currentStamps, required));
  const columns = required <= 5 ? required : required <= 8 ? 4 : required <= 10 ? 5 : required <= 12 ? 4 : 5;

  return (
    <article className={`rounded-[1.75rem] border-4 border-black bg-[#ffb5e8] ${compact ? "p-4" : "p-5 sm:p-7"} shadow-[7px_7px_0_#000]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="" className="h-11 w-11 rounded-xl border-2 border-black bg-white object-cover" /> : <div aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-[#c4b5fd] text-xl font-black">P</div>}
          <div className="min-w-0"><p className="truncate text-xs font-black uppercase tracking-[0.13em]">{businessName}</p><p className="text-sm font-black">Tu tarjeta de fidelidad</p></div>
        </div>
        <span className="shrink-0 rounded-full border-2 border-black bg-white px-3 py-1 text-sm font-black">{current}/{required}</span>
      </div>

      <div className="mt-5 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: required }, (_, offset) => {
          const index = offset + 1;
          const isLast = index === required;
          const state = isLast && current < required
            ? "reward"
            : index <= current ? "earned" : index === current + 1 ? "next" : "pending";
          return <LoyaltyStamp key={index} index={index} total={required} state={state} />;
        })}
      </div>

      <div className="mt-5 rounded-2xl border-2 border-black bg-[#fffaf0] p-4">
        <p className="font-black">{enabled ? loyaltyProgressCopy(current, required) : "Programa desactivado"}</p>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.13em] text-black/55">Al completar tu tarjeta</p>
        <p className="mt-0.5 text-sm font-black">{rewardLabel}</p>
      </div>
    </article>
  );
}
