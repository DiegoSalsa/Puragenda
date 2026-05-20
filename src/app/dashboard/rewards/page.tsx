import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { getOrCreateAffiliate, getUserPrizes, getTokenBalance } from "@/server/services/affiliate.service";
import { Trophy } from "lucide-react";
import { RewardsClient } from "./rewards-client";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo el administrador puede acceder a esta sección</div>;
  }

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;

  const affiliate = await getOrCreateAffiliate(business.id);
  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id } });
  const prizes = await getUserPrizes(business.id);

  const tokenBalance = getTokenBalance(affiliate);
  const hasActiveDiscount = (subscription?.pendingDiscountPercentage ?? 0) > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Trophy className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recompensas</h1>
          <p className="text-sm text-muted-foreground">Gira la ruleta o canjea fichas por descuentos en tu suscripción.</p>
        </div>
      </div>
      <RewardsClient
        tokenBalance={tokenBalance}
        hasActiveDiscount={hasActiveDiscount}
        discountPercentage={subscription?.pendingDiscountPercentage || 0}
        prizes={prizes.map((p) => ({
          id: p.id,
          type: p.type,
          percentage: p.percentage,
          freeMonths: p.freeMonths,
          name: p.name,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        }))}
      />

      <PageTutorial
        tutorialKey="recompensas_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "RECOMPENSAS Y RULETA",
              description: "Utiliza las fichas doradas que has ganado invitando a otros negocios para obtener descuentos reales en tu suscripción de Puragenda.",
            }
          },
          {
            element: ".space-y-8 > div:nth-child(2)",
            popover: {
              title: "GIRA LA RULETA",
              description: "Puedes arriesgar tus fichas en la ruleta de la suerte, o si lo prefieres, canjear un descuento seguro.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
