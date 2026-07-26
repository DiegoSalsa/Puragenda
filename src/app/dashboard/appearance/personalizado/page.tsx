import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { AppearanceForm } from "../appearance-form";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import { prisma } from "@/server/db/prisma";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

export const dynamic = "force-dynamic";

export default async function PersonalizadoPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para editar la apariencia</div>;
  }
  const promoBlocks = await prisma.widgetPromoBlock.findMany({
    where: { businessId: business.id },
    orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      linkUrl: true,
      placement: true,
      position: true,
      isVisible: true,
      textAlign: true,
      discountType: true,
      discountValue: true,
      discountStartsAt: true,
      discountEndsAt: true,
      discountMinSubtotal: true,
    },
  });

  return (
    <>
      <AppearanceForm
        initialData={{
          primaryColor: business.primaryColor,
          secondaryColor: business.secondaryColor,
          backgroundColor: business.backgroundColor,
          textColor: business.textColor,
          textMutedColor: business.textMutedColor,
          widgetFontSize: business.widgetFontSize,
          widgetCornerRadius: business.widgetCornerRadius,
          widgetShadowStyle: business.widgetShadowStyle,
          widgetHeaderAlign: business.widgetHeaderAlign,
          logoUrl: business.logoUrl || "",
        }}
        widgetSlug={business.slug}
        promoBlocks={promoBlocks}
      />
      <PageTutorial
        tutorialKey="apariencia_v1"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            popover: {
              title: "DISEÑO PERSONALIZADO",
              description: "Ajusta los colores y la tipografía para que el widget de reservas encaje perfectamente con la identidad de tu marca.",
            }
          },
          {
            element: "form",
            popover: {
              title: "COLORES DE LA MARCA",
              description: "Cambia el color principal (botones), el color de fondo, y el color de los textos para crear tu diseño único.",
              side: "top",
              align: "start"
            }
          },
          {
            element: "iframe",
            popover: {
              title: "VISTA PREVIA EN VIVO",
              description: "Observa en tiempo real cómo se verá el widget para tus clientes mientras haces cambios en los colores.",
              side: "left",
              align: "start"
            }
          }
        ]}
      />
    </>
  );
}
