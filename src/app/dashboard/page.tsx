import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { DASHBOARD_PERMISSIONS, type DashboardPermission } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { getExistingBusinessMarketplacePrompt } from "@/server/services/marketplace-onboarding.service";
import { loadTodayDashboard } from "@/server/services/today-dashboard.service";
import { MarketplaceConsentPrompt } from "./marketplace-consent-prompt";
import { TodayScreen } from "./today-screen";

export const dynamic = "force-dynamic";

const AGENDA_PARAM = /^\d{4}-\d{2}-\d{2}$/;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; agenda?: string; location?: string }>;
}) {
  const t = await getTranslations("dashboard.home");
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">{t("authRequired")}</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">{t("businessRequired")}</div>;

  const permissions = await getEffectiveBusinessPermissions(user, business);
  const canSeeAppointments = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN)
    || permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL);
  if (!canSeeAppointments) {
    const landingRoutes: [DashboardPermission, string][] = [
      [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_OWN, "/dashboard/analytics"],
      [DASHBOARD_PERMISSIONS.ANALYTICS_VIEW_BUSINESS, "/dashboard/analytics"],
      [DASHBOARD_PERMISSIONS.STAFF_MANAGE, "/dashboard/staff"],
      [DASHBOARD_PERMISSIONS.SERVICES_MANAGE, "/dashboard/services"],
      [DASHBOARD_PERMISSIONS.CLIENTS_MANAGE, "/dashboard/clients"],
      [DASHBOARD_PERMISSIONS.RECURRING_MANAGE, "/dashboard/recurring"],
      [DASHBOARD_PERMISSIONS.LOYALTY_MANAGE, "/dashboard/loyalty"],
      [DASHBOARD_PERMISSIONS.MARKETING_MANAGE, "/dashboard/marketing"],
      [DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE, "/dashboard/appearance/personalizado"],
      [DASHBOARD_PERMISSIONS.REFERRALS_VIEW, "/dashboard/referrals"],
      [DASHBOARD_PERMISSIONS.REWARDS_VIEW, "/dashboard/rewards"],
      [DASHBOARD_PERMISSIONS.SETTINGS_MANAGE, "/dashboard/settings"],
    ];
    const firstAllowedRoute = landingRoutes.find(([permission]) => permissions.includes(permission))?.[1];
    if (firstAllowedRoute) redirect(firstAllowedRoute);
    return <div className="py-20 text-center text-muted-foreground">{t("noFeatures")}</div>;
  }

  const params = await searchParams;
  if (params.date && AGENDA_PARAM.test(params.date)) {
    const query = new URLSearchParams();
    query.set("date", params.date);
    if (params.agenda) query.set("agenda", params.agenda);
    if (params.location) query.set("location", params.location);
    redirect(`/dashboard/agenda?${query.toString()}`);
  }

  const [data, marketplacePrompt] = await Promise.all([
    loadTodayDashboard({
      user,
      business,
      permissions,
      agenda: params.agenda,
      location: params.location,
    }),
    permissions.includes(DASHBOARD_PERMISSIONS.SETTINGS_MANAGE)
      ? getExistingBusinessMarketplacePrompt(business.id)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <SubscriptionBanner businessId={business.id} timezone={business.timezone} countryCode={business.countryCode} />
      {marketplacePrompt ? <MarketplaceConsentPrompt prompt={marketplacePrompt} /> : null}
      <TodayScreen data={data} />
    </div>
  );
}
