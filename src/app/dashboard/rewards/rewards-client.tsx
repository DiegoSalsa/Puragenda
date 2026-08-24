"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState, useTransition, useEffect } from "react";
import { Coins, Trophy, Loader2, ChevronRight, ChevronLeft, Gift, Gem, Star, Award, Crown, Search, X } from "@/components/icons/hover-icons";
import type { LucideIcon } from "@/components/icons/hover-icons";
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

interface PrizeVisuals {
  Icon: LucideIcon;
  color: string;
  glow: boolean;
  tierLabel: string;
}

function getPrizeVisuals(prize: PrizeData): PrizeVisuals {
  if (prize.type === "FREE_MONTH") {
    if ((prize.freeMonths ?? 0) >= 3) {
      return { Icon: Trophy, color: "#EF4444", glow: true,  tierLabel: "Legendario" };
    }
    return   { Icon: Gift,  color: "#F59E0B", glow: true,  tierLabel: "Épico" };
  }
  if (prize.type === "PERCENTAGE") {
    const pct = prize.percentage ?? 0;
    if (pct >= 50) return { Icon: Gem,   color: "#F43F5E", glow: true,  tierLabel: "Diamante" };
    if (pct >= 30) return { Icon: Gem,   color: "#D946EF", glow: false, tierLabel: "Platino"  };
    if (pct >= 20) return { Icon: Crown, color: "#8B5CF6", glow: false, tierLabel: "Oro"      };
    if (pct >= 15) return { Icon: Star,  color: "#0EA5E9", glow: false, tierLabel: "Plata"    };
    return             { Icon: Award, color: "#10B981", glow: false, tierLabel: "Bronce"   };
  }
  // NONE / FREE_SPIN — shouldn't be stored as prizes but handle gracefully
  return { Icon: Star, color: "#6B7280", glow: false, tierLabel: "Premio" };
}

const PRIZE_PER_PAGE = 6;
const TIER_FILTERS = ["Todos", "Bronce", "Plata", "Oro", "Platino", "Diamante", "Épico", "Legendario"];
const STATUS_FILTERS = [
  { label: "Todos",       value: "Todos"     },
  { label: "Disponibles", value: "AVAILABLE" },
  { label: "Activos",     value: "ACTIVE"    },
  { label: "Usados",      value: "USED"      },
];

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
  const legacy = useTranslations("legacy");
  const [activeTab, setActiveTab] = useState<"ruleta" | "premios">("ruleta");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);
  const [activatingPrizeId, setActivatingPrizeId] = useState<string | null>(null);
  const [prizeSearch, setPrizeSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [prizePage, setPrizePage] = useState(1);

  const availablePrizes = prizes.filter((p) => p.status === "AVAILABLE");
  const activePrizes    = prizes.filter((p) => p.status === "ACTIVE");
  const usedPrizes      = prizes.filter((p) => p.status === "USED");

  const filteredPrizes = prizes.filter((p) => {
    const { tierLabel } = getPrizeVisuals(p);
    const matchSearch = !prizeSearch || p.name.toLowerCase().includes(prizeSearch.toLowerCase());
    const matchTier   = tierFilter === "Todos" || tierLabel === tierFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    return matchSearch && matchTier && matchStatus;
  });
  const totalPrizePages = Math.ceil(filteredPrizes.length / PRIZE_PER_PAGE);
  const paginatedPrizes = filteredPrizes.slice((prizePage - 1) * PRIZE_PER_PAGE, prizePage * PRIZE_PER_PAGE);
  const hasAnyActivePrize = activePrizes.length > 0;

  const fixedProgress = Math.min(tokenBalance, 3);
  const fixedProgressPercent = (fixedProgress / 3) * 100;

  function handleRedeemFixed() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await redeemFixedDiscountAction();
      if (!result.success) {
        setError(result.error || legacy("CKe835ezrZ0b"));
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
        setError(result.error || legacy("MWMw4_dRZUTr"));
      }
      setActivatingPrizeId(null);
    });
  }

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
              <p className="text-3xl font-black" style={{ color: tokenBalance > 0 ? "var(--brand-foreground)" : undefined }}>
                {tokenBalance}
              </p>
              <p className="text-xs text-muted-foreground"><LocalizedText id="UU_47MkYsLmU" /></p>
            </div>
          </div>
          {hasActiveDiscount && (
            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-2">
              <p className="text-xs font-medium text-[#F59E0B]">
                {discountPercentage}<LocalizedText id="DePUoxgwd0Zq" />
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
            <LocalizedText id="iEELD6ZW9S1m" />
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
            <LocalizedText id="-2yqNx4b2mwq" />
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

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20">
            <X className="h-3 w-3 text-red-500" />
          </div>
          <p className="flex-1 text-sm font-medium text-red-600 dark:text-red-400 leading-snug">{error}</p>
          <button onClick={() => setError(null)} className="mt-0.5 shrink-0 text-red-400 hover:text-red-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/25 bg-green-500/10 px-4 py-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <Trophy className="h-3 w-3 text-green-500" />
          </div>
          <p className="flex-1 text-sm font-medium text-green-600 dark:text-green-400 leading-snug">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="mt-0.5 shrink-0 text-green-400 hover:text-green-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
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
                  <Trophy className="h-5 w-5 text-brand-foreground" />
                  <h2 className="text-lg font-bold"><LocalizedText id="jS0_Dwzb4y0F" /></h2>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span><LocalizedText id="zQxJh1OOatbP" /></span>
                    <span><LocalizedText id="AqEMG03kYYZ_" /></span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { name: legacy("tEGV72Hcpybw"), prob: "10%", color: "#4B5563" },
                      { name: "1 Ficha Gratis", prob: "15%", color: "#3B82F6" },
                      { name: "Bronce (10% OFF)", prob: "25%", color: "#10B981" },
                      { name: "Plata (15% OFF)", prob: "20%", color: "#0EA5E9" },
                      { name: "Oro (20% OFF)", prob: "13%", color: "#8B5CF6" },
                      { name: "Platino (30% OFF)", prob: "10%", color: "#D946EF" },
                      { name: "Diamante (50% OFF)", prob: "4%", color: "#F43F5E" },
                      { name: legacy("xdknmD-Moe1U"), prob: "2%", color: "#F59E0B" },
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
                  <Coins className="h-5 w-5 text-brand-foreground" />
                  <h2 className="text-lg font-bold"><LocalizedText id="JjOG5aC72AOy" /></h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  <LocalizedText id="cCWj2OX3NZHL" />
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium"><LocalizedText id="HUqe6yFdIiHX" /></p>
                    <span className="text-sm font-mono font-bold" style={{ color: "var(--brand-foreground)" }}>
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
                    <LocalizedText id="_mNYqh5Gn4ET" />
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
        <div className="space-y-5">
          {/* Active discount warning */}
          {hasActiveDiscount && (
            <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
              <p className="text-sm font-medium text-[#F59E0B]">
                <LocalizedText id="rF2ZLA0zZW6A" />{discountPercentage}<LocalizedText id="GGTUJ_MnV-Lz" />
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Disponibles", count: availablePrizes.length, color: "#7C3AED" },
              { label: "Activos",     count: activePrizes.length,    color: "#F59E0B" },
              { label: "Usados",      count: usedPrizes.length,      color: "#6B7280" },
              { label: "Total",       count: prizes.length,          color: "#10B981" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="text-2xl font-black" style={{ color }}>{count}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Active prizes — always pinned at top */}
          {activePrizes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"><LocalizedText id="nRVlol3NvqL6" /></h3>
              </div>
              {activePrizes.map((prize) => {
                const { Icon, color } = getPrizeVisuals(prize);
                return (
                  <div key={prize.id} className="flex items-center gap-4 rounded-2xl border-2 border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{prize.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prize.type === "PERCENTAGE"
                          ? `${prize.percentage ?? "?"}% de descuento`
                          : `${prize.freeMonths ?? 1} mes${(prize.freeMonths ?? 1) > 1 ? "es" : ""} gratis`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      <LocalizedText id="yySYGeu_Pqfo" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search + filter panel */}
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={legacy("iHOJgQrBYHxr")}
                value={prizeSearch}
                onChange={(e) => { setPrizeSearch(e.target.value); setPrizePage(1); }}
                className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-9 text-sm outline-none focus:border-[#7C3AED]/40 transition-colors"
              />
              {prizeSearch && (
                <button onClick={() => { setPrizeSearch(""); setPrizePage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ label, value }) => {
                const count = value === "Todos" ? prizes.length : value === "AVAILABLE" ? availablePrizes.length : value === "ACTIVE" ? activePrizes.length : usedPrizes.length;
                return (
                  <button
                    key={value}
                    onClick={() => { setStatusFilter(value); setPrizePage(1); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      statusFilter === value
                        ? "bg-[#7C3AED] text-white"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                    <span className={`rounded-full px-1.5 text-[9px] font-bold ${
                      statusFilter === value ? "bg-white/20 text-white" : "bg-muted-foreground/20"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Tier filter */}
            <div className="flex flex-wrap gap-1.5">
              {TIER_FILTERS.map((tier) => {
                const tierCount = tier === "Todos" ? prizes.length : prizes.filter((p) => getPrizeVisuals(p).tierLabel === tier).length;
                if (tierCount === 0 && tier !== "Todos") return null;
                return (
                  <button
                    key={tier}
                    onClick={() => { setTierFilter(tier); setPrizePage(1); }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      tierFilter === tier
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tier}{tier !== "Todos" && <span className="ml-1 opacity-50">·{tierCount}</span>}
                  </button>
                );
              })}
            </div>

            {/* Result count + clear */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredPrizes.length}</span>{" "}
                {filteredPrizes.length === 1 ? "premio" : "premios"}
              </p>
              {(prizeSearch || tierFilter !== "Todos" || statusFilter !== "Todos") && (
                <button
                  onClick={() => { setPrizeSearch(""); setTierFilter("Todos"); setStatusFilter("Todos"); setPrizePage(1); }}
                  className="flex items-center gap-1 text-[11px] text-brand-foreground hover:underline"
                >
                  <X className="h-3 w-3" /> <LocalizedText id="v8LRYjWGjnzE" />
                </button>
              )}
            </div>
          </div>

          {/* Prize grid */}
          {paginatedPrizes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {paginatedPrizes.map((prize) => {
                const { Icon, color, glow, tierLabel } = getPrizeVisuals(prize);
                const canActivate = !hasActiveDiscount && !hasAnyActivePrize && prize.status === "AVAILABLE";
                const isUsed = prize.status === "USED";
                const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
                  AVAILABLE: { bg: "rgba(124,58,237,0.12)",  text: "#A855F7", label: "Disponible" },
                  ACTIVE:    { bg: "rgba(245,158,11,0.12)",  text: "#F59E0B", label: "Activo"     },
                  USED:      { bg: "rgba(107,114,128,0.12)", text: "#6B7280", label: "Usado"      },
                };
                const st = statusStyle[prize.status] ?? { bg: "rgba(107,114,128,0.12)", text: "#6B7280", label: prize.status };
                const displayColor = isUsed ? "#6B7280" : color;
                return (
                  <div
                    key={prize.id}
                    className="group relative overflow-hidden rounded-2xl border-2 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                    style={{
                      borderColor: isUsed ? "#6B728030" : `${color}30`,
                      opacity: isUsed ? 0.65 : 1,
                      boxShadow: glow && !isUsed ? `0 0 28px ${color}18` : undefined,
                    }}
                  >
                    <div className="h-1 w-full" style={{ background: isUsed ? "#6B7280" : `linear-gradient(90deg, ${color}, ${color}40)` }} />
                    {glow && !isUsed && (
                      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at top right, ${color}08, transparent 70%)` }} />
                    )}
                    <div className="relative p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${displayColor}15` }}>
                          <Icon className="h-6 w-6" style={{ color: displayColor }} />
                        </div>
                        <div className="text-right leading-none">
                          <p className="text-4xl font-black tabular-nums" style={{ color: displayColor }}>
                            {prize.type === "PERCENTAGE"
                              ? `${prize.percentage ?? "?"}%`
                              : prize.type === "FREE_MONTH"
                                ? `${prize.freeMonths ?? 1}M`
                                : "—"}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {prize.type === "PERCENTAGE" ? "descuento" : prize.type === "FREE_MONTH" ? "gratis" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="flex-1 text-sm font-bold truncate">{prize.name}</p>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${displayColor}15`, color: displayColor }}>
                          {tierLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-muted-foreground/60">{new Date(prize.createdAt).toLocaleDateString("es-CL")}</p>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </div>
                      {prize.status === "AVAILABLE" && (
                        <button
                          onClick={() => handleActivatePrize(prize.id)}
                          disabled={isPending || !canActivate}
                          className="w-full rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1.5"
                          style={{
                            background: canActivate ? `linear-gradient(135deg, ${color}, ${color}bb)` : "#374151",
                            boxShadow: canActivate ? `0 4px 12px ${color}30` : "none",
                          }}
                        >
                          {activatingPrizeId === prize.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><LocalizedText id="YrfHSN52KfpI" /> <ChevronRight className="h-3 w-3" /></>}
                        </button>
                      )}
                      {prize.status === "ACTIVE" && (
                        <div className="w-full rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-center">
                          <p className="text-[11px] font-semibold text-[#F59E0B]"><LocalizedText id="yySYGeu_Pqfo" /></p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-12 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]/10 mb-4">
                <Trophy className="h-7 w-7 text-brand-foreground" />
              </div>
              {prizes.length === 0 ? (
                <>
                  <p className="text-sm font-medium mb-1"><LocalizedText id="w7_GiCg22I7o" /></p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    <LocalizedText id="Xy4HM2VbuPBo" />
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1"><LocalizedText id="v5_BmD_6eEES" /></p>
                  <p className="text-xs text-muted-foreground max-w-xs"><LocalizedText id="lcMQ4hcFhNBN" /></p>
                </>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPrizePages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setPrizePage((p) => Math.max(1, p - 1))}
                disabled={prizePage === 1}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> <LocalizedText id="5M58CdUeO4gx" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPrizePages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrizePage(p)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      p === prizePage ? "bg-[#7C3AED] text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPrizePage((p) => Math.min(totalPrizePages, p + 1))}
                disabled={prizePage === totalPrizePages}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <LocalizedText id="SWg7ccas9SJB" /> <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
