
import { LocalizedText } from "@/components/i18n/localized-text";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Stamp } from "lucide-react";
import { LoyaltyConfigForm } from "./loyalty-config-form";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="92MLir4qhMgu" /></div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="8rEGoq2nl-vn" /></div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground"><LocalizedText id="6HL0Yo7lttob" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Stamp className="h-8 w-8 text-[#7C3AED]" />
          <LocalizedText id="KfCnckvorAoy" />
        </h1>
        <p className="mt-1 text-muted-foreground">
          <LocalizedText id="f8lV4w40Icjf" />
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <LoyaltyConfigForm
          initialData={{
            isLoyaltyEnabled: business.isLoyaltyEnabled,
            stampsRequired: business.stampsRequired,
            rewardName: business.rewardName ?? "",
            discountType: business.discountType ?? "PERCENTAGE",
            discountValue: business.discountValue ?? 0,
            loyaltyCodePrefix: business.loyaltyCodePrefix,
          }}
        />
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-6">
        <h3 className="text-sm font-semibold text-[#7C3AED] mb-2"><LocalizedText id="Th8TqSkxybtS" /></h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span><LocalizedText id="xr-QiqF8b3D-" /> <strong className="text-foreground"><LocalizedText id="sUhZDAsLj9kJ" /></strong><LocalizedText id="SGUQ_qoCfufT" /></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span><LocalizedText id="TUqOrwFQUHLZ" /> <strong className="text-foreground"><LocalizedText id="s82urGsq4Nv-" /></strong> <LocalizedText id="HQ-i7ObaZR6S" /></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span><LocalizedText id="hzX8FthTCrHv" /> <strong className="text-foreground"><LocalizedText id="Nuj0ae1yfPk2" /></strong> <LocalizedText id="QcpG5mwlo9K4" /></span>
          </li>
        </ul>
      </div>

      <PageTutorial
        tutorialKey="fidelizacion_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "FIDELIZACIÓN DE CLIENTES",
              description: "Activa una tarjeta de timbres digital automática. Premia a tus clientes más leales para que siempre vuelvan.",
            }
          },
          {
            element: "form",
            popover: {
              title: "CONFIGURACIÓN DEL PREMIO",
              description: "Define cuántas visitas se necesitan para ganar un premio y de qué trata el descuento o servicio gratuito.",
              side: "top",
              align: "start"
            }
          },
          {
            element: ".space-y-8 > div:last-child",
            popover: {
              title: "AUTOMATIZACIÓN",
              description: "No tienes que hacer nada manual. El sistema sumará un timbre por cada cita completada y le notificará al cliente.",
              side: "top",
              align: "start"
            }
          }
        ]}
      />
    </div>
  );
}
