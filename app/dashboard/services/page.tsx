import { getCurrentSessionUser } from "@/backend/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/backend/services/business.service";
import { getServicesByBusinessId } from "@/backend/services/service.service";
import { ServicesClient } from "./services-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Debes iniciar sesion para ver tus servicios
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No tienes un negocio configurado aun
      </div>
    );
  }

  const services = await getServicesByBusinessId(business.id);

  return <ServicesClient initialServices={services} />;
}
