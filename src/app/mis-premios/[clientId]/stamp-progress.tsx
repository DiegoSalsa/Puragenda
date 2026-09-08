import { LoyaltyStamp } from "@/components/loyalty/loyalty-stamp";

export function StampProgress({ currentStamps, stampsRequired }: { currentStamps: number; stampsRequired: number }) {
  const required = Math.max(2, Math.min(30, stampsRequired));
  const current = Math.max(0, Math.min(currentStamps, required));
  const columns = required <= 5 ? required : required <= 8 ? 4 : required <= 10 ? 5 : required <= 12 ? 4 : 5;
  return <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {Array.from({ length: required }, (_, offset) => {
      const index = offset + 1;
      const state = index === required && current < required ? "reward" : index <= current ? "earned" : index === current + 1 ? "next" : "pending";
      return <LoyaltyStamp key={index} index={index} total={required} state={state} />;
    })}
  </div>;
}
