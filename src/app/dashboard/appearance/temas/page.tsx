import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { TemasGallery } from "./temas-gallery";

export const dynamic = "force-dynamic";

export default async function TemasPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;

  return (
    <TemasGallery
      currentColors={{
        primaryColor: business.primaryColor,
        secondaryColor: business.secondaryColor,
        backgroundColor: business.backgroundColor,
        textColor: business.textColor,
        textMutedColor: business.textMutedColor,
      }}
      currentFontSize={business.widgetFontSize}
      currentLogoUrl={business.logoUrl ?? undefined}
      widgetSlug={business.slug}
    />
  );
}
