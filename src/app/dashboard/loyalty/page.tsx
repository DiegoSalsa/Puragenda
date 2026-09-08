import { Gift, Stamp, Trophy, Users } from "@/components/icons/hover-icons";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { LoyaltyConfigForm } from "./loyalty-config-form";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center">Debes iniciar sesión.</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center">No encontramos tu negocio.</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE))) return <div className="py-20 text-center">No tienes permisos para administrar fidelización.</div>;

  const [services, clients, participants, stampAggregate, generated, used] = await Promise.all([
    prisma.service.findMany({ where: { businessId: business.id, bookingMode: "APPOINTMENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
    prisma.client.findMany({ where: { businessId: business.id }, orderBy: [{ currentStamps: "desc" }, { name: "asc" }], take: 12, select: { id: true, name: true, email: true, currentStamps: true } }),
    prisma.client.count({ where: { businessId: business.id, OR: [{ currentStamps: { gt: 0 } }, { loyaltyCodes: { some: {} } }] } }),
    prisma.loyaltyStampEvent.aggregate({ where: { businessId: business.id, delta: { gt: 0 } }, _sum: { delta: true } }),
    prisma.loyaltyCode.count({ where: { businessId: business.id } }),
    prisma.loyaltyCode.count({ where: { businessId: business.id, isUsed: true } }),
  ]);
  const redemptionRate = generated ? Math.round(used * 100 / generated) : 0;
  const metrics = [
    { label: "Clientes participando", value: participants, icon: Users, color: "bg-[#c4b5fd]" },
    { label: "Timbres entregados", value: stampAggregate._sum.delta ?? 0, icon: Stamp, color: "bg-[#bffcc6]" },
    { label: "Premios generados", value: generated, icon: Gift, color: "bg-[#ffb5e8]" },
    { label: "Tasa de canje", value: `${redemptionRate}%`, icon: Trophy, color: "bg-[#fff5ba]" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Fidelización V2</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-black tracking-tight"><Stamp className="h-8 w-8" /> Constructor de fidelización</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">Premia automáticamente a tus clientes cuando completan sus visitas.</p>
      </header>

      <section aria-label="Métricas de fidelización" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color }) => <div key={label} className={`${color} rounded-2xl border-3 border-black p-4 shadow-[4px_4px_0_#000]`}><Icon className="h-5 w-5" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-black">{label}</p></div>)}
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
