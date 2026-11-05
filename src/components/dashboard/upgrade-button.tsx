"use client";
import Link from "next/link";
import { Crown, Sparkles } from "@/components/icons/hover-icons";

export function UpgradeButton() {
  return (
    <div className="space-y-3">
      <Link
        href="/dashboard/settings/upgrade"
        className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7C3AED]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Crown className="h-4.5 w-4.5" />
        <span>Pasar a Puragenda+</span>
        <Sparkles className="h-3.5 w-3.5 text-white/70" />
      </Link>
    </div>
  );
}
