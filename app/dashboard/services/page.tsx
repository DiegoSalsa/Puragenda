import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { getServicesByBusinessId } from "@/server/services/service.service";
import { ServicesClient } from "./services-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return (
      <div className="py-20 text-center text-white/40">
        Debes iniciar sesión para ver tus servicios
      </div>
    );
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  if (!business) {
    return (
      <div className="py-20 text-center text-white/40">
        No tienes un negocio configurado aún
      </div>
    );
  }

  const services = await getServicesByBusinessId(business.id);

  return <ServicesClient initialServices={services} />;
}
