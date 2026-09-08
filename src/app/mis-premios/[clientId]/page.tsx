import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Gift, History, Stamp } from "@/components/icons/hover-icons";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import { loyaltyRewardLabel } from "@/core/loyalty";
import { prisma } from "@/server/db/prisma";
import { getClientPortalEmail } from "@/server/services/client-portal.service";
import { RewardCard } from "./reward-card";
import { getLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export function generateViewport(): Viewport { return { themeColor: "#fffaf0" }; }
export function generateMetadata(): Metadata { return { title: "Mi tarjeta | Puragenda", description: "Tu tarjeta y premios de fidelización.", robots: { index: false, follow: false } }; }

export default async function MisPremiosPage({ params }: { params: Promise<{ clientId: string }> }) {
  const t = await getTranslations("loyalty.portal");
  const locale = await getLocale();
  const { clientId } = await params;
  const email = await getClientPortalEmail();
  if (!email) redirect(`/mi-agenda?returnTo=${encodeURIComponent(`/mis-premios/${clientId}`)}`);

  const client = await prisma.client.findFirst({
    where: { id: clientId, email: { equals: email, mode: "insensitive" } },
    select: {
      id: true, name: true, currentStamps: true,
      business: { select: {
        id: true, name: true, slug: true, logoUrl: true, currencyCode: true,
        isLoyaltyEnabled: true, stampsRequired: true, rewardName: true,
        loyaltyRewardType: true, discountValue: true,
        loyaltyRewardService: { select: { name: true } },
      } },
      loyaltyCodes: { orderBy: { createdAt: "desc" }, take: 20, select: {
        id: true, code: true, rewardName: true, rewardType: true, discountValue: true,
        createdAt: true, expiresAt: true, isUsed: true, usedAt: true,
        freeService: { select: { name: true } },
        redeemedAppointment: { select: { startTime: true } },
      } },
      loyaltyStampEvents: { orderBy: { createdAt: "desc" }, take: 12, select: {
        id: true, delta: true, source: true, reason: true, createdAt: true,
        appointment: { select: { startTime: true, service: { select: { name: true } } } },
      } },
    },
  });
  if (!client) notFound();

  const now = new Date();
  const available = client.loyaltyCodes.filter((reward) => !reward.isUsed && (!reward.expiresAt || reward.expiresAt > now));
  const history = client.loyaltyCodes.filter((reward) => reward.isUsed || (reward.expiresAt && reward.expiresAt <= now));
  const goalLabel = loyaltyRewardLabel({ rewardType: client.business.loyaltyRewardType, discountValue: client.business.discountValue, freeServiceName: client.business.loyaltyRewardService?.name, rewardName: client.business.rewardName, currencyCode: client.business.currencyCode, locale });

  return <main className="min-h-screen bg-[#fffaf0] text-black">
    <header className="border-b-3 border-black bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8"><Link href="/" aria-label="Puragenda"><img src="/logos/logoPuragendaSVG.svg" alt="Puragenda" className="h-14 w-auto sm:h-16" /></Link><Link href="/mi-agenda" className="rounded-xl border-2 border-black bg-[#c4b5fd] px-4 py-2 text-sm font-black shadow-[2px_2px_0_#000]">{t("back")}</Link></div></header>
    <div className="mx-auto max-w-5xl space-y-9 px-5 py-8 sm:px-8 sm:py-12">
      <section className="rounded-[2rem] border-4 border-black bg-[#c4b5fd] p-6 shadow-[8px_8px_0_#000] sm:p-9"><p className="text-xs font-black uppercase tracking-[0.18em]">{t("eyebrow", { business: client.business.name })}</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">{t("hello", { name: client.name.split(/\s+/)[0] })}</h1><p className="mt-3 font-semibold">{t("intro")}</p></section>

      {!client.business.isLoyaltyEnabled ? <section className="rounded-2xl border-3 border-dashed border-black/40 bg-white p-8 text-center"><Stamp className="mx-auto h-10 w-10 opacity-40" /><p className="mt-3 font-black">{t("disabled")}</p></section> : <div className="max-w-4xl"><LoyaltyCard businessName={client.business.name} logoUrl={client.business.logoUrl} currentStamps={client.currentStamps} stampsRequired={client.business.stampsRequired} rewardLabel={goalLabel} /></div>}

      <section><div className="mb-4 flex items-center gap-3"><Gift className="h-6 w-6" /><h2 className="text-2xl font-black">{t("availableRewards")}</h2><span className="rounded-full border-2 border-black bg-[#bffcc6] px-2.5 text-sm font-black">{available.length}</span></div>{available.length ? <div className="grid gap-4 md:grid-cols-2">{available.map((reward) => <RewardCard key={reward.id} reward={reward} currencyCode={client.business.currencyCode} bookingUrl={`/widget/${client.business.slug}`} />)}</div> : <div className="rounded-2xl border-3 border-dashed border-black/35 bg-white/60 p-7 text-center font-semibold">{t("emptyRewards")}</div>}</section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div><div className="mb-4 flex items-center gap-3"><History className="h-6 w-6" /><h2 className="text-xl font-black">{t("recentActivity")}</h2></div><div className="overflow-hidden rounded-2xl border-3 border-black bg-white">{client.loyaltyStampEvents.length ? client.loyaltyStampEvents.map((event, index) => <div key={event.id} className={`flex items-center justify-between gap-4 p-4 ${index ? "border-t-2 border-black/10" : ""}`}><div><p className="font-black">{event.reason || t(event.source === "APPOINTMENT" ? "completedVisit" : "stampAdjustment")}</p><p className="text-xs font-semibold text-black/50">{event.appointment?.service.name ?? t("loyaltyRecord")} · {event.createdAt.toLocaleDateString(locale)}</p></div><span className={`rounded-full border-2 border-black px-2 py-1 text-xs font-black ${event.delta > 0 ? "bg-[#bffcc6]" : "bg-[#fff5ba]"}`}>{event.delta > 0 ? "+" : ""}{event.delta}</span></div>) : <p className="p-5 text-sm font-semibold text-black/50">{t("emptyHistory")}</p>}</div></div>
        <div><div className="mb-4 flex items-center gap-3"><CalendarDays className="h-6 w-6" /><h2 className="text-xl font-black">{t("previousRewards")}</h2></div><div className="space-y-3">{history.length ? history.map((reward) => <RewardCard key={reward.id} reward={reward} currencyCode={client.business.currencyCode} bookingUrl={`/widget/${client.business.slug}`} compact />) : <div className="rounded-2xl border-3 border-dashed border-black/35 bg-white/60 p-5 text-sm font-semibold">{t("emptyPrevious")}</div>}</div></div>
      </section>

      <Link href={`/widget/${client.business.slug}`} className="flex min-h-14 items-center justify-center rounded-2xl border-3 border-black bg-[#fff5ba] px-6 text-center font-black shadow-[5px_5px_0_#000]">{t("bookAgain")}</Link>
    </div>
  </main>;
}
