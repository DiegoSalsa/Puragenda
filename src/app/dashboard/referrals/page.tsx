
import { LocalizedText } from "@/components/i18n/localized-text";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getAffiliateInfo, getOrCreateAffiliate, getTokenBalance } from "@/server/services/affiliate.service";
import { Gift } from "lucide-react";
import { ReferralsClient } from "./referrals-client";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="92MLir4qhMgu" /></div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="JzdJYFMcoEJN" /></div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.REFERRALS_VIEW))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="HALnXywCzk0E" /></div>;
  }

  const affiliate = await getOrCreateAffiliate(business.id);
  const info = await getAffiliateInfo(business.id);
  const tokenBalance = getTokenBalance(affiliate);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Gift className="h-5 w-5 text-brand-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><LocalizedText id="wgPakJ2NbGW3" /></h1>
          <p className="text-sm text-muted-foreground"><LocalizedText id="_W04AZJL-pen" /></p>
        </div>
      </div>
      <ReferralsClient
        referralCode={affiliate.referralCode}
        paidReferrals={affiliate.paidReferrals}
        tokenBalance={tokenBalance}
        referredBusinesses={info?.referredBusinesses.map((b) => ({
          id: b.id,
          name: b.name,
          createdAt: b.createdAt.toISOString(),
          status: b.subscription?.status || "INACTIVE",
        })) || []}
      />

      <PageTutorial
        tutorialKey="referidos_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "PROGRAMA DE REFERIDOS",
              description: "Comparte tu código de invitación con otros negocios. Cuando se suscriban, ganarás fichas doradas.",
            }
          },
          {
            element: "#referral-code-card",
            popover: {
              title: "TU CÓDIGO",
              description: "Copia este enlace o código y compártelo. Por cada referido exitoso sumarás más fichas.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
