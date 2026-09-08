import { Gift, Info, Stamp, Trophy, Users } from "@/components/icons/hover-icons";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { LoyaltyConfigForm } from "./loyalty-config-form";
import { getTranslations } from "next-intl/server";
import { calculateLoyaltyRedemptionRate } from "@/core/loyalty";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const t = await getTranslations("loyalty.dashboard");
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center">{t("loginRequired")}</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center">{t("businessRequired")}</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE))) return <div className="py-20 text-center">{t("permissionDenied")}</div>;

  const [services, clients, participants, stampAggregate, generated, used] = await Promise.all([
    prisma.service.findMany({ where: { businessId: business.id, bookingMode: "APPOINTMENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
    prisma.client.findMany({ where: { businessId: business.id }, orderBy: [{ currentStamps: "desc" }, { name: "asc" }], take: 12, select: { id: true, name: true, email: true, currentStamps: true } }),
    prisma.client.count({ where: { businessId: business.id, OR: [{ currentStamps: { gt: 0 } }, { loyaltyStampEvents: { some: {} } }, { loyaltyCodes: { some: {} } }] } }),
    prisma.loyaltyStampEvent.aggregate({ where: { businessId: business.id, delta: { gt: 0 } }, _sum: { delta: true } }),
    prisma.loyaltyCode.count({ where: { businessId: business.id } }),
    prisma.loyaltyCode.count({ where: { businessId: business.id, isUsed: true } }),
  ]);
  const redemptionRate = calculateLoyaltyRedemptionRate(generated, used);
  const metrics = [
    { label: t("participants"), value: participants, icon: Users, color: "bg-[#c4b5fd]" },
    { label: t("stampsDelivered"), value: stampAggregate._sum.delta ?? 0, icon: Stamp, color: "bg-[#bffcc6]", hint: t("stampsHint") },
    { label: t("rewardsGenerated"), value: generated, icon: Gift, color: "bg-[#ffb5e8]" },
    { label: t("redemptionRate"), value: `${redemptionRate}%`, icon: Trophy, color: "bg-[#fff5ba]", hint: t("redemptionHint") },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-black tracking-tight"><Stamp className="h-8 w-8" /> {t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section aria-label={t("metricsLabel")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color, hint }) => <div key={label} className={`${color} rounded-2xl border-3 border-black p-4 shadow-[4px_4px_0_#000]`}><div className="flex items-center justify-between"><Icon className="h-5 w-5" />{hint && <span title={hint} aria-label={hint} tabIndex={0} className="inline-flex cursor-help rounded-full"><Info className="h-4 w-4" /></span>}</div><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-black">{label}</p></div>)}
      </section>

      <LoyaltyConfigForm
        initialData={{
          isLoyaltyEnabled: business.isLoyaltyEnabled,
          stampsRequired: business.stampsRequired,
          rewardName: business.rewardName ?? "",
          rewardType: business.loyaltyRewardType,
          discountValue: business.discountValue ?? 0,
          rewardServiceId: business.loyaltyRewardServiceId,
          expirationDays: business.loyaltyRewardExpirationDays,
          loyaltyCodePrefix: business.loyaltyCodePrefix,
        }}
        business={{ name: business.name, logoUrl: business.logoUrl, currencyCode: business.currencyCode }}
        services={services}
        clients={clients}
      />
    </div>
  );
}
