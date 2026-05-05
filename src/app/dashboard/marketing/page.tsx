import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { getBusinessForUser } from "@/server/services/business.service";
import { getSubscriptionByBusinessId } from "@/server/services/subscription.service";
import {
  getMarketingLimits,
  getCampaignsThisMonth,
  getLastCampaign,
  getCampaignHistory,
} from "@/server/services/marketing.service";
import { MarketingDashboard } from "./marketing-dashboard";
import type { SubscriptionPlan } from "@/core/entities";

export default async function MarketingPage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/dashboard/settings");

  const subscription = await getSubscriptionByBusinessId(business.id);
  const plan: SubscriptionPlan = subscription?.plan ?? "INDIVIDUAL";
  const limits = getMarketingLimits(plan);

  const [campaignsSent, lastCampaign, history] = await Promise.all([
    getCampaignsThisMonth(business.id),
    getLastCampaign(business.id),
    getCampaignHistory(business.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing & Win-Back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envía campañas inteligentes para reactivar a tus clientes menos frecuentes
        </p>
      </div>
      <MarketingDashboard
        plan={plan}
        campaignsSentThisMonth={campaignsSent}
        maxCampaignsPerMonth={limits.maxCampaignsPerMonth}
        maxAudienceSize={limits.maxEmails}
        lastCampaign={
          lastCampaign
            ? {
                subject: lastCampaign.subject,
                audienceSize: lastCampaign.audienceSize,
                sentAt: lastCampaign.sentAt.toISOString(),
              }
            : null
        }
        history={history.map((c) => ({
          id: c.id,
          subject: c.subject,
          audienceSize: c.audienceSize,
          sentAt: c.sentAt.toISOString(),
        }))}
      />
    </div>
  );
}
