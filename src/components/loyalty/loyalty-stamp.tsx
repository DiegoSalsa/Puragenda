import { Check, Gift, Stamp } from "@/components/icons/hover-icons";

export function LoyaltyStamp({ index, total, state }: {
  index: number;
  total: number;
  state: "earned" | "next" | "pending" | "reward";
}) {
  const earned = state === "earned";
  const isReward = state === "reward";
  const label = isReward
    ? `Premio al completar ${total} visitas`
    : `Timbre ${index} de ${total} ${earned ? "obtenido" : state === "next" ? "siguiente" : "pendiente"}`;
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex aspect-square min-w-0 items-center justify-center rounded-[32%] border-[3px] border-black transition-transform
        ${earned ? "bg-[#bffcc6] shadow-[3px_3px_0_#000]" : isReward ? "bg-[#fff5ba] shadow-[3px_3px_0_#000]" : state === "next" ? "border-dashed bg-[#ffb5e8]/45" : "border-dashed bg-white/65"}`}
      style={{ transform: earned ? `rotate(${index % 2 === 0 ? -2 : 2}deg)` : undefined }}
    >
      {isReward ? <Gift className="h-[45%] w-[45%]" strokeWidth={2.7} /> : <Stamp className={`h-[46%] w-[46%] ${earned ? "text-black" : "text-black/30"}`} strokeWidth={2.7} />}
      {earned && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white"><Check className="h-3 w-3" strokeWidth={4} /></span>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
