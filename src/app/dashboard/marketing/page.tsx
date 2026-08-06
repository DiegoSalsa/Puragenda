
import { LocalizedText } from "@/components/i18n/localized-text";
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
import { PageTutorial } from "@/components/dashboard/page-tutorial";
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
        <h1 className="text-2xl font-bold tracking-tight"><LocalizedText id="dyefH5KVKfWL" /></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <LocalizedText id="kPIxO74WxmE3" />
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

      <PageTutorial
        tutorialKey="marketing_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "MARKETING INTELIGENTE",
              description: "Envía correos masivos a tus clientes para reactivar ventas, anunciar promociones o informar sobre nuevos servicios.",
            }
          },
          {
            element: "#btn-nueva-campana",
            popover: {
              title: "NUEVA CAMPAÑA",
              description: "Puedes crear una campaña filtrando a tu audiencia, por ejemplo: 'Clientes que no asisten hace más de 60 días'.",
              side: "left",
              align: "start"
            }
          },
          {
            element: ".space-y-6 > div:last-child",
            popover: {
              title: "MÉTRICAS Y LIMITES",
              description: "Revisa tu límite mensual de correos según tu plan y observa el historial de las campañas que ya has enviado.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
