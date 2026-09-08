"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Gift } from "@/components/icons/hover-icons";
import { loyaltyRewardLabel, type LoyaltyRewardKind } from "@/core/loyalty";
import { useLocale, useTranslations } from "next-intl";

type Reward = {
  code: string; rewardName: string | null; rewardType: LoyaltyRewardKind; discountValue: number | null;
  createdAt: Date; expiresAt: Date | null; isUsed: boolean; usedAt: Date | null;
  freeService: { name: string } | null; redeemedAppointment: { startTime: Date } | null;
};

export function RewardCard({ reward, currencyCode, bookingUrl, compact = false }: { reward: Reward; currencyCode: string; bookingUrl: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("loyalty.reward");
  const locale = useLocale();
  const expired = !!reward.expiresAt && new Date(reward.expiresAt) <= new Date();
  const available = !reward.isUsed && !expired;
  const benefit = loyaltyRewardLabel({ rewardType: reward.rewardType, discountValue: reward.discountValue, freeServiceName: reward.freeService?.name, rewardName: reward.rewardName, currencyCode, locale });
  const status = reward.isUsed ? t("used") : expired ? t("expired") : t("available");
  const formatDate = (date: Date) => new Date(date).toLocaleDateString(locale);
  async function copy() { await navigator.clipboard.writeText(reward.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return <article className={`rounded-2xl border-3 border-black ${available ? "bg-[#bffcc6] shadow-[5px_5px_0_#000]" : "bg-white opacity-75"} ${compact ? "p-4" : "p-5"}`}>
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#fff5ba]"><Gift className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.15em]">{t(available ? "unlocked" : "history")}</p><h3 className="font-black">{reward.rewardName || t("defaultName")}</h3><p className="text-sm font-semibold">{benefit}</p></div></div><span className={`rounded-full border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${available ? "bg-white" : expired ? "bg-red-100" : "bg-[#c4b5fd]"}`}>{status}</span></div>
    <div className="mt-4 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-xl border-2 border-black bg-white px-3 py-2 text-center font-black tracking-wider">{reward.code}</code><button type="button" onClick={copy} aria-label={t("copy")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_#000]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
    <div className="mt-3 text-xs font-semibold text-black/55"><p>{t("obtained", { date: formatDate(reward.createdAt) })}</p><p>{reward.expiresAt ? t("validUntil", { date: formatDate(reward.expiresAt) }) : t("noExpiration")}</p>{reward.isUsed && reward.usedAt && <p>{t("usedAt", { date: formatDate(reward.usedAt) })}</p>}</div>
    {available && !compact && <Link href={bookingUrl} className="mt-4 flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-[#ffb5e8] px-4 text-sm font-black shadow-[3px_3px_0_#000]">{t("use")}</Link>}
  </article>;
}
