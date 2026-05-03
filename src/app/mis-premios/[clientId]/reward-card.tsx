"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";

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
    setTimeout(() => setCopied(false), 2000);
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
    <div className="group rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/[0.08] to-transparent p-5 transition-all duration-300 hover:border-[#7C3AED]/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-[#A78BFA] shrink-0" />
            <p className="text-sm font-semibold text-white truncate">
              {rewardName || "Premio de fidelización"}
            </p>
          </div>
          <p className="text-xs text-[#A78BFA]/70">{discountLabel}</p>
        </div>

        <span className="text-[10px] text-white/25 shrink-0 pt-0.5">{dateStr}</span>
      </div>

      {/* Code */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 font-mono text-sm tracking-wider text-[#A78BFA] select-all">
          {code}
        </div>
        <button
          onClick={handleCopy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
            copied
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.08] bg-white/[0.04] text-white/40 hover:border-[#7C3AED]/30 hover:text-[#A78BFA]"
          }`}
          aria-label="Copiar código"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-white/20">
        Presenta este código en tu próxima visita para hacerlo válido.
      </p>
    </div>
  );
}
