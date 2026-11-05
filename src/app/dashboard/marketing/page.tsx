import { LocalizedText } from "@/components/i18n/localized-text";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { getBusinessForUser } from "@/server/services/business.service";
import { getCampaignHistory } from "@/server/services/marketing.service";
import { getMarketingAvailability } from "@/server/services/marketing-availability.service";
import { MarketingDashboard } from "./marketing-dashboard";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export default async function MarketingPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/dashboard/settings");
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.MARKETING_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="cw5m0x2piRZB" /></div>;
  }
  const [availability, history] = await Promise.all([
    getMarketingAvailability(user, business.id),
    getCampaignHistory(business.id),
  ]);
  const visibleHistory = availability.state === "LEGACY_PAUSED" ? [] : history;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><LocalizedText id="dyefH5KVKfWL" /></h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulta el estado de los envíos comerciales y tu historial de campañas.</p>
      </div>
       <MarketingDashboard availability={availability} history={visibleHistory.map(c => ({
        id: c.id, subject: c.subject, audienceSize: c.audienceSize, sentAt: c.sentAt.toISOString(),
      }))} />
    </div>
  );
}
