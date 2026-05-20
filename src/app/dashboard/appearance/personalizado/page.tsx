import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { AppearanceForm } from "../appearance-form";
import { PageTutorial } from "@/components/dashboard/page-tutorial";

export const dynamic = "force-dynamic";

export default async function PersonalizadoPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;

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
          logoUrl: business.logoUrl || "",
        }}
        widgetSlug={business.slug}
      />
      <PageTutorial
        tutorialKey="apariencia_v1"
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
