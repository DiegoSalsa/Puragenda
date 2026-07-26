import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { TemasGallery } from "./temas-gallery";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

export const dynamic = "force-dynamic";

export default async function TemasPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para gestionar temas</div>;
  }
  const { prisma } = await import("@/server/db/prisma");
  const savedThemes = await prisma.widgetTheme.findMany({
    where: { businessId: business.id },
    orderBy: { updatedAt: "desc" },
  });

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
      savedThemes={savedThemes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        category: theme.category,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        textMutedColor: theme.textMutedColor,
        fontSize: theme.fontSize,
        cornerRadius: theme.cornerRadius,
        shadowStyle: theme.shadowStyle,
        headerAlign: theme.headerAlign,
        logoUrl: theme.logoUrl,
      }))}
    />
  );
}
