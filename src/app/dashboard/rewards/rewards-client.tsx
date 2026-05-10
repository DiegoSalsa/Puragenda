"use client";

import { useState, useTransition } from "react";
import { Coins, Trophy, Loader2, ChevronRight } from "lucide-react";
import { spinRouletteAction, redeemFixedDiscountAction, activatePrizeAction } from "./actions";
import { RouletteMinigame } from "@/components/dashboard/roulette-minigame";

interface PrizeData {
  id: string;
  type: string;
  percentage: number | null;
  freeMonths: number | null;
  name: string;
  status: string;
  createdAt: string;
}

export function RewardsClient({
  tokenBalance,
  hasActiveDiscount,
  discountPercentage,
  prizes,
}: {
  tokenBalance: number;
  hasActiveDiscount: boolean;
  discountPercentage: number;
  prizes: PrizeData[];
}) {
  const [activeTab, setActiveTab] = useState<"ruleta" | "premios">("ruleta");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activatingPrizeId, setActivatingPrizeId] = useState<string | null>(null);

  const availablePrizes = prizes.filter((p) => p.status === "AVAILABLE");
  const activePrizes = prizes.filter((p) => p.status === "ACTIVE");
  const usedPrizes = prizes.filter((p) => p.status === "USED");
  const hasAnyActivePrize = activePrizes.length > 0;

  const fixedProgress = Math.min(tokenBalance, 3);
  const fixedProgressPercent = (fixedProgress / 3) * 100;

  function handleRedeemFixed() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await redeemFixedDiscountAction();
      if (!result.success) {
        setError(result.error || "Error al canjear");
      } else {
        setSuccessMsg("¡Fichas canjeadas con éxito! Tienes un descuento de 50% OFF disponible en la pestaña 'Mis Premios' para activarlo cuando quieras.");
      }
    });
  }

  function handleActivatePrize(prizeId: string) {
    setError(null);
    setActivatingPrizeId(prizeId);
    startTransition(async () => {
      const result = await activatePrizeAction(prizeId);
      if (!result.success) {
        setError(result.error || "Error al activar el premio");
      }
      setActivatingPrizeId(null);
    });
  }

  const prizeStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
    AVAILABLE: { bg: "rgba(124,58,237,0.15)", text: "#A855F7", label: "Disponible" },
    ACTIVE: { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", label: "En uso" },
    USED: { bg: "rgba(107,114,128,0.15)", text: "#6B7280", label: "Usado" },
  };

  return (
    <div className="space-y-6">
      {/* ── Token Balance ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: tokenBalance > 0 ? "rgba(124,58,237,0.15)" : "rgba(107,114,128,0.1)" }}
            >
              <Coins className="h-5 w-5" style={{ color: tokenBalance > 0 ? "#7C3AED" : "#6B7280" }} />
            </div>
            <div>
              <p className="text-3xl font-black" style={{ color: tokenBalance > 0 ? "#7C3AED" : undefined }}>
                {tokenBalance}
              </p>
              <p className="text-xs text-muted-foreground">Fichas disponibles</p>
            </div>
          </div>
          {hasActiveDiscount && (
            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2">
              <p className="text-xs font-medium text-[#F59E0B]">
                {discountPercentage}% OFF pendiente en tu próximo cobro
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("ruleta")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "ruleta"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Coins className="h-4 w-4" />
            Ruleta y Canje
          </span>
        </button>
        <button
          onClick={() => setActiveTab("premios")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all relative ${
            activeTab === "premios"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" />
            Mis Premios
            {availablePrizes.length > 0 && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "#7C3AED" }}
              >
                {availablePrizes.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {successMsg && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">{successMsg}</p>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB: RULETA Y CANJE                */}
      {/* ═══════════════════════════════════ */}
      {activeTab === "ruleta" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Roulette on the left */}
            <div className="rounded-2xl border-2 border-[#7C3AED]/20 bg-card p-6 sm:p-8 flex items-center justify-center">
              <div className="w-full max-w-[500px] mx-auto">
                <RouletteMinigame
                  onSpin={async () => {
                    const result = await spinRouletteAction();
                    return result;
                  }}
                  disabled={false}
                  tokenBalance={tokenBalance}
                />
              </div>
            </div>

            {/* Right column: Probabilities & Fixed Discount */}
            <div className="space-y-6 flex flex-col">
              
              {/* Prize Table */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-[#7C3AED]" />
                  <h2 className="text-lg font-bold">Probabilidades</h2>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Premio</span>
                    <span>Probabilidad</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { name: "Más Suerte", prob: "10%", color: "#4B5563" },
                      { name: "1 Ficha Gratis", prob: "15%", color: "#3B82F6" },
                      { name: "Bronce (10% OFF)", prob: "25%", color: "#10B981" },
                      { name: "Plata (15% OFF)", prob: "20%", color: "#0EA5E9" },
                      { name: "Oro (20% OFF)", prob: "13%", color: "#8B5CF6" },
                      { name: "Platino (30% OFF)", prob: "10%", color: "#D946EF" },
                      { name: "Diamante (50% OFF)", prob: "4%", color: "#F43F5E" },
                      { name: "Mes de Regalo", prob: "2%", color: "#F59E0B" },
                      { name: "Trimestre Invencible", prob: "1%", color: "#EF4444" },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-xs font-semibold">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-muted-foreground">{p.prob}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fixed discount exchange */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-[#7C3AED]" />
                  <h2 className="text-lg font-bold">Canje Seguro</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Canjea 3 fichas por un 50% de descuento garantizado en tu próximo mes.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Progreso</p>
                    <span className="text-sm font-mono font-bold" style={{ color: "#7C3AED" }}>
                      {fixedProgress}/3
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${fixedProgressPercent}%`,
                        background: "linear-gradient(90deg, #7C3AED, #a855f7)",
                      }}
                    />
                  </div>
                  <button
                    onClick={handleRedeemFixed}
                    disabled={isPending || tokenBalance < 3}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: tokenBalance >= 3
                        ? "linear-gradient(135deg, #7C3AED, #5B21B6)"
                        : "#374151",
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Coins className="h-4 w-4" />
                    )}
                    Canjear por 50% OFF
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB: MIS PREMIOS                   */}
      {/* ═══════════════════════════════════ */}
      {activeTab === "premios" && (
        <div className="space-y-6">
          {/* Active discount warning */}
          {hasActiveDiscount && (
            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
              <p className="text-sm font-medium text-[#F59E0B]">
                Tienes un descuento activo ({discountPercentage}% OFF). No puedes activar otro premio hasta que sea cobrado.
              </p>
            </div>
          )}

          {/* Available Prizes */}
          {availablePrizes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#7C3AED]" />
                Premios Disponibles ({availablePrizes.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePrizes.map((prize) => {
                  const st = prizeStatusStyles[prize.status];
                  return (
                    <div
                      key={prize.id}
                      className="group rounded-2xl border-2 border-[#7C3AED]/20 bg-card p-4 transition-all hover:border-[#7C3AED]/40 hover:shadow-lg hover:shadow-[#7C3AED]/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold">{prize.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prize.type === "PERCENTAGE"
                              ? `${prize.percentage}% de descuento`
                              : `${prize.freeMonths} mes${(prize.freeMonths ?? 0) > 1 ? "es" : ""} gratis`}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            Ganado el {new Date(prize.createdAt).toLocaleDateString("es-CL")}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: st.bg, color: st.text }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleActivatePrize(prize.id)}
                        disabled={isPending || hasActiveDiscount || hasAnyActivePrize}
                        className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        style={{
                          background:
                            !hasActiveDiscount && !hasAnyActivePrize
                              ? "linear-gradient(135deg, #7C3AED, #D946EF)"
                              : "#374151",
                        }}
                      >
                        {activatingPrizeId === prize.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            Activar premio
                            <ChevronRight className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Prizes */}
          {activePrizes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                Premio Activo
              </h3>
              {activePrizes.map((prize) => (
                <div
                  key={prize.id}
                  className="rounded-2xl border-2 border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{prize.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prize.type === "PERCENTAGE"
                          ? `${prize.percentage}% de descuento`
                          : `${prize.freeMonths} mes${(prize.freeMonths ?? 0) > 1 ? "es" : ""} gratis`}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
                    >
                      Se aplica en tu próximo cobro
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {availablePrizes.length === 0 && activePrizes.length === 0 && usedPrizes.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-12 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]/10 mb-4">
                <Trophy className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <p className="text-sm font-medium mb-1">Sin premios aún</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Gira la ruleta o canjea 3 fichas desde la pestaña &quot;Ruleta y Canje&quot; para ganar premios.
              </p>
            </div>
          )}

          {/* Used Prizes History */}
          {usedPrizes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Historial de Premios Usados ({usedPrizes.length})
              </h3>
              <div className="space-y-2">
                {usedPrizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60"
                  >
                    <div>
                      <p className="text-sm font-medium">{prize.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prize.type === "PERCENTAGE"
                          ? `${prize.percentage}% OFF`
                          : `${prize.freeMonths} mes${(prize.freeMonths ?? 0) > 1 ? "es" : ""} gratis`}
                      </p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(107,114,128,0.15)", color: "#6B7280" }}>
                      Usado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
