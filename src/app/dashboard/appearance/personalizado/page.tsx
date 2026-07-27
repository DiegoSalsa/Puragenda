import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { PageTutorial } from "@/components/dashboard/page-tutorial";
import {
  WidgetStudioEditor,
  type WidgetStudioInitialState,
} from "@/components/widget-studio/widget-studio-editor";
import { WidgetStudioEntry } from "@/components/widget-studio/widget-studio-entry";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getWidgetEditorState } from "@/server/services/widget-design.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function PersonalizadoPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;

  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para editar la apariencia</div>;
  }
  const state = await getWidgetEditorState(business.id);
  const initialState: WidgetStudioInitialState | null = state ? {
    designId: state.id,
    draftDocument: state.draftDocument,
    draftRevision: state.draftRevision,
    rendererEnabled: state.rendererEnabled,
    publishedVersion: state.publishedVersion ? {
      ...state.publishedVersion,
      createdAt: state.publishedVersion.createdAt.toISOString(),
    } : null,
    fallbackVersion: state.fallbackVersion ? {
      ...state.fallbackVersion,
      createdAt: state.fallbackVersion.createdAt.toISOString(),
    } : null,
    versions: state.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      checksum: version.checksum,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt.toISOString(),
      publishedBy: version.publishedBy,
    })),
    assets: state.assets.map((asset) => ({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
    })),
  } : null;

  return (
    <>
      {initialState ? (
        <WidgetStudioEditor initialState={initialState} widgetSlug={business.slug} />
      ) : (
        <WidgetStudioEntry widgetSlug={business.slug} />
      )}
      <PageTutorial
        tutorialKey="widget_studio_v2"
        dependsOnKey="general"
        userEmail={user.email}
        steps={[
          {
            element: "[data-tour='widget-studio']",
            popover: {
              title: "EDITOR DEL WIDGET",
              description: "Trabaja sobre un borrador privado. Tus clientes no verán cambios hasta que publiques.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "[data-tour='studio-preview']",
            popover: {
              title: "PREVIEW REAL Y RESPONSIVE",
              description: "Cambia entre móvil, tablet y escritorio. Esta vista usa el mismo renderer que producción.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "[data-tour='studio-inspector']",
            popover: {
              title: "PERSONALIZA CADA BLOQUE",
              description: "Selecciona un bloque para editar contenido, posición, imagen, responsive y diseño.",
              side: "left",
              align: "start",
            },
          },
        ]}
      />
    </>
  );
}
