import { useState, useTransition } from "react";
import { Copy, Check, Gift, Users, TrendingUp, Star, Loader2 } from "lucide-react";
import { redeemRewardAction } from "./actions";

interface ReferredBusiness {
  id: string;
  name: string;
  createdAt: string;
  status: string;
}

export function ReferralsClient({
  referralCode,
  paidReferrals,
  availableRewards,
  nextThreshold,
  previousThreshold,
  discountPercentage,
  referredBusinesses,
}: {
  referralCode: string;
  paidReferrals: number;
  availableRewards: number;
  nextThreshold: number;
  previousThreshold: number;
  discountPercentage: number;
  referredBusinesses: ReferredBusiness[];
}) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentLevelProgress = paidReferrals - previousThreshold;
  const currentLevelGoal = nextThreshold - previousThreshold;
  const progress = Math.min((currentLevelProgress / currentLevelGoal) * 100, 100);
  
  const hasActiveDiscount = discountPercentage > 0;

  function handleCopy() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRedeem() {
    setError(null);
    startTransition(async () => {
      const result = await redeemRewardAction();
      if (!result.success) {
        setError(result.error || "Error al canjear el premio");
      }
    });
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: "Pagado", color: "#22c55e" },
    TRIALING: { label: "En prueba", color: "#f59e0b" },
    INACTIVE: { label: "Inactivo", color: "#ef4444" },
    CANCELLED: { label: "Cancelado", color: "#6b7280" },
  };

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Tu código de referido</p>
            <p className="text-xs text-muted-foreground">Compártelo con otros negocios para que se registren con tu código.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-5 py-3">
              <span className="font-mono text-lg font-bold tracking-widest text-[#7C3AED]">{referralCode}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 sm:gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{referredBusinesses.length}</p>
              <p className="text-xs text-muted-foreground">Referidos totales</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paidReferrals}</p>
              <p className="text-xs text-muted-foreground">Referidos que pagaron</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${availableRewards > 0 ? "" : "bg-muted"}`} style={availableRewards > 0 ? { background: "rgba(124,58,237,0.15)" } : undefined}>
              <Star className={`h-4 w-4 ${availableRewards > 0 ? "" : "text-muted-foreground"}`} style={availableRewards > 0 ? { color: "#7C3AED" } : undefined} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: availableRewards > 0 ? "#7C3AED" : undefined }}>
                {availableRewards}
              </p>
              <p className="text-xs text-muted-foreground">Premios disponibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Progreso hacia el próximo premio (50% off)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consigue {nextThreshold - paidReferrals} referido(s) pagado(s) más para desbloquear tu próximo premio.
            </p>
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: "#7C3AED" }}>
            {currentLevelProgress}/{currentLevelGoal}
          </span>
        </div>
        
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7C3AED, #a855f7)",
            }}
          />
        </div>

        {/* Redeem Reward Section */}
        {availableRewards > 0 && (
          <div className="pt-4 mt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Tienes {availableRewards} premio(s) por canjear</p>
              <p className="text-xs text-muted-foreground">Cada premio aplica un 50% de descuento en tu próximo cobro.</p>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <button
              onClick={handleRedeem}
              disabled={isPending || hasActiveDiscount}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                hasActiveDiscount
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[#7C3AED] text-white hover:bg-[#5B21B6]"
              }`}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasActiveDiscount ? "Premio en espera - 1 activo" : "Canjear premio (50% off)"}
            </button>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <p className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-[#7C3AED]" />
          ¿Cómo funciona?
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">1</div>
            <p className="font-medium text-foreground">Comparte tu código</p>
            <p>Envía tu código de referido a otros negocios. ¡Ellos reciben un 25% de descuento en su primer mes!</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">2</div>
            <p className="font-medium text-foreground">Alcanza los niveles</p>
            <p>Gana premios al llegar a 3, 5, 10 y 15 referidos pagados. (Luego, cada 15 referidos adicionales).</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">3</div>
            <p className="font-medium text-foreground">Canjea tus premios</p>
            <p>Cada premio equivale a un 50% de descuento en tu próximo mes. Úsalos manualmente cuando quieras.</p>
          </div>
        </div>
      </div>

      {/* Referred businesses list */}
      {referredBusinesses.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <p className="text-sm font-medium">Negocios referidos</p>
          <div className="space-y-2">
            {referredBusinesses.map((b) => {
              const st = statusLabels[b.status] || statusLabels.INACTIVE;
              return (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("es-CL")}</p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: `${st.color}15`, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
