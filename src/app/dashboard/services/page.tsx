import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getServicesByBusinessId } from "@/server/services/service.service";
import { ServicesClient } from "./services-client";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Debes iniciar sesión para ver tus servicios
      </div>
    );
  }

  const business = await getBusinessForUser(user.id);

  if (!business) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        No tienes un negocio configurado aún
      </div>
    );
  }

  const services = await getServicesByBusinessId(business.id);

  return (
    <>
      <ServicesClient
        initialServices={services}
        maxServicesPerBooking={business.maxServicesPerBooking}
        depositEnabled={business.depositRequired && !!business.mpAccessToken}
        businessPolicies={{
          requiresClientRut: business.requiresClientRut,
          allowRescheduling: business.allowRescheduling,
        }}
      />
      <PageTutorial
        tutorialKey="servicios_v1"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "TUS SERVICIOS",
              description: "Aquí defines lo que ofreces a tus clientes. Agrega nombres, duraciones, precios y reglas de abono.",
            }
          },
          {
            element: "button[title='Añadir servicio']",
            popover: {
              title: "AÑADIR SERVICIO",
              description: "Haz clic aquí para crear un nuevo servicio en tu catálogo.",
              side: "bottom",
              align: "end"
            }
          },
          {
            element: "button[title='Configuración general']",
            popover: {
              title: "REGLAS GENERALES",
              description: "Configura si los clientes pueden elegir múltiples servicios a la vez o si se requiere pagar un abono online para reservar.",
              side: "bottom",
              align: "start"
            }
          }
        ]}
      />
    </>
  );
}
