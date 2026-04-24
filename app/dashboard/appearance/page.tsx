import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
import { Palette } from "lucide-react";
import { AppearanceForm } from "./appearance-form";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-white/40">Debes iniciar sesión</div>;

  const business = await getFirstBusinessByOwnerId(user.id);
  if (!business) return <div className="py-20 text-center text-white/40">No tienes un negocio</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Palette className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apariencia</h1>
          <p className="text-sm text-white/40">Personaliza los colores y logo de tu widget de reservas.</p>
        </div>
      </div>
      <AppearanceForm
        initialData={{
          primaryColor: business.primaryColor,
          secondaryColor: business.secondaryColor,
          backgroundColor: business.backgroundColor,
          logoUrl: business.logoUrl || "",
        }}
        widgetSlug={business.slug}
      />
    </div>
  );
}
