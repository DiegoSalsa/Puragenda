"use client";

import { useState } from "react";
import { Copy, Check, Gift, Users, TrendingUp, Coins, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ReferredBusiness {
  id: string;
  name: string;
  createdAt: string;
  status: string;
}

export function ReferralsClient({
  referralCode,
  paidReferrals,
  tokenBalance,
  referredBusinesses,
}: {
  referralCode: string;
  paidReferrals: number;
  tokenBalance: number;
  referredBusinesses: ReferredBusiness[];
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: "Pagado", color: "#22c55e" },
    TRIALING: { label: "En prueba", color: "#f59e0b" },
    INACTIVE: { label: "Inactivo", color: "#ef4444" },
    CANCELLED: { label: "Cancelado", color: "#6b7280" },
  };

  return (
    <div className="space-y-6">
      {/* ── Referral Code Card ── */}
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

      {/* ── Stats Grid ── */}
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

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: tokenBalance > 0 ? "rgba(124,58,237,0.15)" : undefined }}
            >
              <Coins
                className="h-4 w-4"
                style={{ color: tokenBalance > 0 ? "#7C3AED" : undefined }}
              />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: tokenBalance > 0 ? "#7C3AED" : undefined }}>
                {tokenBalance}
              </p>
              <p className="text-xs text-muted-foreground">Fichas disponibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA to Rewards ── */}
      {tokenBalance > 0 && (
        <Link
          href="/dashboard/rewards"
          className="flex items-center justify-between rounded-2xl border-2 border-[#7C3AED]/20 bg-[#7C3AED]/5 p-5 transition-all hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/15">
              <Coins className="h-5 w-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-sm font-bold">Tienes {tokenBalance} ficha{tokenBalance !== 1 ? "s" : ""} disponible{tokenBalance !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Gira la ruleta o canjea premios en Recompensas</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-[#7C3AED] transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      {/* ── How it works ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <p className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-[#7C3AED]" />
          ¿Cómo funciona?
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">1</div>
            <p className="font-medium text-foreground">Comparte tu código</p>
            <p>Envía tu código de referido a otros negocios. Ellos reciben un 25% de descuento en su primer mes.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">2</div>
            <p className="font-medium text-foreground">Gana fichas</p>
            <p>Cada vez que un referido pague su suscripción, ganas 1 ficha automáticamente.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">3</div>
            <p className="font-medium text-foreground">Canjea en Recompensas</p>
            <p>Gira la ruleta (1 ficha) o canjea 3 fichas por un 50% OFF seguro desde la página de Recompensas.</p>
          </div>
        </div>
      </div>

      {/* ── Referred businesses list ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <p className="text-sm font-medium">Negocios referidos</p>
        {referredBusinesses.length > 0 ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aún no tienes negocios referidos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Comparte tu código para comenzar a ganar fichas</p>
          </div>
        )}
      </div>
    </div>
  );
}
