"use client";

import { useState } from "react";
import { Check, Copy, Gift, Sparkles } from "lucide-react";

interface RewardCardProps {
  code: string;
  rewardName: string | null;
  discountType: string;
  discountValue: number;
  createdAt: string;
}

export function RewardCard({ code, rewardName, discountType, discountValue, createdAt }: RewardCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const discountLabel =
    discountType === "PERCENTAGE"
      ? `${discountValue}% de descuento`
      : `$${discountValue.toLocaleString()} de descuento`;

  const dateStr = new Date(createdAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#D4AF37]/[0.08] via-white/[0.02] to-[#7C3AED]/[0.05] p-5 transition-all duration-500 hover:border-[#D4AF37]/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent rounded-bl-3xl" />
      <div className="absolute bottom-0 left-0 h-16 w-16 bg-gradient-to-tr from-[#7C3AED]/10 to-transparent rounded-tr-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/30 to-[#F5E6A3]/10 border border-[#D4AF37]/20">
                <Gift className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {rewardName || "Premio de fidelización"}
                </p>
                <p className="text-xs text-[#D4AF37]/80 font-medium">{discountLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-[#D4AF37]/50" />
            <span className="text-[10px] text-white/25">{dateStr}</span>
          </div>
        </div>

        {/* Code */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] px-4 py-3 text-center font-mono text-base sm:text-lg tracking-[0.25em] font-bold text-[#F5E6A3] select-all">
            {code}
          </div>
          <button
            onClick={handleCopy}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
              copied
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 scale-95"
                : "border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] text-[#D4AF37]/70 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] hover:scale-105 active:scale-95"
            }`}
            aria-label="Copiar código"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-white/30 text-center">
          {copied ? "✓ Código copiado al portapapeles" : "Presenta este código al agendar tu próxima cita"}
        </p>
      </div>
    </div>
  );
}
