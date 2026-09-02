"use client";

import { useTranslations } from "next-intl";
import { PricingCards } from "@/components/pricing-cards";
import { STAFF_LIMITS } from "@/core/constants";

export function PricingHero() {
  const t = useTranslations("pricing");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-black uppercase tracking-tighter sm:text-5xl lg:text-6xl">{t("pageTitle")}</h1>
      <p className="mx-auto mb-4 mt-4 max-w-xl text-balance text-center font-bold text-black/70 dark:text-gray-400">{t("pageSubtitle")}</p>
      <PricingCards mode="landing" />
    </section>
  );
}

export function PricingComparisonTable() {
  const t = useTranslations("pricingComparison");
  const rows = [
    ["unlimitedBookings", t("unlimited"), t("unlimited")],
    ["bookingWidget", "✓", "✓"],
    ["adminPanel", "✓", "✓"],
    ["whiteLabel", "✓", "✓"],
    ["winBack", "✓", "✓"],
    ["includedStaff", String(STAFF_LIMITS.INDIVIDUAL), String(STAFF_LIMITS.EQUIPO)],
    ["roles", "✗", "✓"],
  ] as const;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <h2 className="mb-12 text-center text-2xl font-black uppercase tracking-tighter sm:text-3xl">{t("title")}</h2>
      <div className="overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[8px_8px_0_#FFFFFF]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b-4 border-black bg-[#FFF5BA] text-black dark:border-white dark:bg-black dark:text-white">
                <th className="border-r-4 border-black p-4 font-black uppercase dark:border-white">{t("feature")}</th>
                <th className="border-r-4 border-black p-4 text-center font-black uppercase dark:border-white">{t("individual")}</th>
                <th className="p-4 text-center font-black uppercase">{t("team")}</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {rows.map(([label, individual, team], index) => (
                <tr key={label} className={index < rows.length - 1 ? "border-b-2 border-black dark:border-white/20" : undefined}>
                  <td className="border-r-2 border-black p-4 dark:border-white/20">{t(label)}</td>
                  <td className={`border-r-2 border-black p-4 text-center dark:border-white/20 ${individual === "✓" ? "text-green-500" : individual === "✗" ? "text-red-500" : ""}`}>{individual}</td>
                  <td className={`p-4 text-center ${team === "✓" ? "text-green-500" : ""}`}>{team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
