import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getServicesByBusinessId } from "@/server/services/service.service";
import { getServiceCategoriesByBusinessId } from "@/server/services/service-category.service";
import { ServicesClient } from "./services-client";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getCountryConfig } from "@/core/countries";

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
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para gestionar servicios.</div>;
  }

  const [services, serviceCategories] = await Promise.all([
    getServicesByBusinessId(business.id),
    getServiceCategoriesByBusinessId(business.id),
  ]);

  return (
    <>
      <ServicesClient
        initialServices={services}
        initialCategories={serviceCategories}
        groupServicesByCategory={business.groupServicesByCategory}
        maxServicesPerBooking={business.maxServicesPerBooking}
        depositEnabled={business.depositRequired && !!business.mpAccessToken}
        productionOrdersEnabled={business.productionOrdersEnabled}
        currencyCode={business.currencyCode}
        taxIdLabel={getCountryConfig(business.countryCode).taxIdLabel}
        businessPolicies={{
          requiresClientRut: business.requiresClientRut,
          allowRescheduling: business.allowRescheduling,
        }}
      />
      <PageTutorial
        tutorialKey="servicios_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "TUS SERVICIOS",
              description: "Aquí defines lo que ofreces a tus clientes. Agrega nombres, duraciones, precios y reglas de abono.",
            }
          },
          {
            element: "#btn-nuevo-servicio",
            popover: {
              title: "AÑADIR SERVICIO",
              description: "Haz clic aquí para crear un nuevo servicio en tu catálogo.",
              side: "left",
              align: "start"
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
