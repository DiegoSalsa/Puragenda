import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getAffiliateInfo, getOrCreateAffiliate } from "@/server/services/affiliate.service";
import { Gift } from "lucide-react";
import { ReferralsClient } from "./referrals-client";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo el administrador puede acceder a esta sección</div>;
  }

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;

  // Ensure affiliate record exists
  const affiliate = await getOrCreateAffiliate(business.id);
  const info = await getAffiliateInfo(business.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Gift className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referidos</h1>
          <p className="text-sm text-muted-foreground">Invita negocios y gana descuentos en tu suscripción.</p>
        </div>
      </div>
      <ReferralsClient
        referralCode={affiliate.referralCode}
        paidReferrals={affiliate.paidReferrals}
        referredBusinesses={info?.referredBusinesses.map((b) => ({
          id: b.id,
          name: b.name,
          createdAt: b.createdAt.toISOString(),
          status: b.subscription?.status || "INACTIVE",
        })) || []}
      />
    </div>
  );
}
