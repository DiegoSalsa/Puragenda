"use client";

import { useState } from "react";
import { Copy, Check, Gift, Users, TrendingUp, Star } from "lucide-react";

interface ReferredBusiness {
  id: string;
  name: string;
  createdAt: string;
  status: string;
}

export function ReferralsClient({
  referralCode,
  paidReferrals,
  referredBusinesses,
}: {
  referralCode: string;
  paidReferrals: number;
  referredBusinesses: ReferredBusiness[];
}) {
  const [copied, setCopied] = useState(false);
  const threshold = 10;
  const progress = Math.min((paidReferrals / threshold) * 100, 100);
  const discountActive = paidReferrals >= threshold;

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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
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

        <div className="rounded-2xl border border-border bg-card p-5">
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
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${discountActive ? "" : "bg-muted"}`} style={discountActive ? { background: "rgba(124,58,237,0.15)" } : undefined}>
              <Star className={`h-4 w-4 ${discountActive ? "" : "text-muted-foreground"}`} style={discountActive ? { color: "#7C3AED" } : undefined} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: discountActive ? "#7C3AED" : undefined }}>
                {discountActive ? "15%" : "0%"}
              </p>
              <p className="text-xs text-muted-foreground">Descuento activo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Progreso hacia el descuento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {discountActive
                ? "¡Felicidades! Tienes un 15% de descuento aplicable a tu próximo pago."
                : `Consigue ${threshold - paidReferrals} referido(s) pagado(s) más para desbloquear un 15% de descuento en tu próximo pago.`}
            </p>
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: discountActive ? "#22c55e" : "#7C3AED" }}>
            {paidReferrals}/{threshold}
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: discountActive
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #7C3AED, #a855f7)",
            }}
          />
        </div>
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
            <p>Envía tu código de referido a otros negocios que quieran usar PurAgenda.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">2</div>
            <p className="font-medium text-foreground">Ellos se registran</p>
            <p>Al crear su cuenta, ingresan tu código en el campo &quot;Código de Referido&quot;.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-xs">3</div>
            <p className="font-medium text-foreground">Ganas descuento</p>
            <p>Cuando 10 referidos paguen su suscripción, obtienes un 15% de descuento en tu próximo pago.</p>
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
