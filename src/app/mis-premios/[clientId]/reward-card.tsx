"use client";
import { useTranslations } from "next-intl";

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
  const legacy = useTranslations("legacy");
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
    <div className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--color-primary)/0.25)] bg-gradient-to-br from-[rgb(var(--color-primary)/0.08)] via-[rgb(var(--color-text)/0.02)] to-[rgb(var(--color-primary)/0.05)] p-5 transition-all duration-500 hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-[0_0_30px_rgb(var(--color-primary)/0.12)]">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-[rgb(var(--color-primary)/0.1)] to-transparent rounded-bl-3xl" />
      <div className="absolute bottom-0 left-0 h-16 w-16 bg-gradient-to-tr from-[rgb(var(--color-primary)/0.1)] to-transparent rounded-tr-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary)/0.3)] to-[rgb(var(--color-secondary)/0.1)] border border-[rgb(var(--color-primary)/0.2)]">
                <Gift className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[rgb(var(--color-text))]">
                  {rewardName || legacy("INezGlmgCjf4")}
                </p>
                <p className="text-xs text-[rgb(var(--color-primary)/0.8)] font-medium">{discountLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-[rgb(var(--color-primary)/0.5)]" />
            <span className="text-[10px] text-[rgb(var(--color-text)/0.25)]">{dateStr}</span>
          </div>
        </div>

        {/* Code */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-[rgb(var(--color-primary)/0.15)] bg-[rgb(var(--color-primary)/0.04)] px-4 py-3 text-center font-mono text-base sm:text-lg tracking-[0.25em] font-bold text-[rgb(var(--color-primary))] select-all">
            {code}
          </div>
          <button
            onClick={handleCopy}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300 ${
              copied
                ? "border-[rgb(var(--color-secondary)/0.4)] bg-[rgb(var(--color-secondary)/0.15)] text-[rgb(var(--color-secondary))] scale-95"
                : "border-[rgb(var(--color-primary)/0.2)] bg-[rgb(var(--color-primary)/0.06)] text-[rgb(var(--color-primary)/0.7)] hover:border-[rgb(var(--color-primary)/0.4)] hover:text-[rgb(var(--color-primary))] hover:scale-105 active:scale-95"
            }`}
            aria-label={legacy("GrILd5fSD3QS")}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-[rgb(var(--color-text)/0.3)] text-center">
          {copied ? legacy("-9UuaBka1oWp") : legacy("merEdl3IiBo0")}
        </p>
      </div>
    </div>
  );
}
