import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { Stamp } from "lucide-react";
import { LoyaltyConfigForm } from "./loyalty-config-form";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return <div className="py-20 text-center text-muted-foreground">Solo el administrador puede acceder a esta sección</div>;
  }

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio configurado aún</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Stamp className="h-8 w-8 text-[#7C3AED]" />
          Fidelización
        </h1>
        <p className="mt-1 text-muted-foreground">
          Configura tu programa de tarjetas de timbres para premiar a tus clientes recurrentes.
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
          }}
        />
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-6">
        <h3 className="text-sm font-semibold text-[#7C3AED] mb-2">¿Cómo funciona?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span>Cada vez que una cita se marca como <strong className="text-foreground">Completada</strong>, el cliente recibe un timbre automáticamente.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span>Al acumular la cantidad de timbres configurada, se genera un <strong className="text-foreground">código de premio</strong> único.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7C3AED] shrink-0" />
            <span>Los clientes pueden ver su progreso y premios desde un <strong className="text-foreground">portal público</strong> sin necesidad de crear una cuenta.</span>
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
