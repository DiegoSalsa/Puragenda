import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { WidgetStudioHistory } from "@/components/widget-studio/widget-studio-history";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getWidgetEditorState } from "@/server/services/widget-design.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function WidgetStudioHistoryPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesión</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para ver el historial</div>;
  }
  const state = await getWidgetEditorState(business.id);
  if (!state) return <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">Crea primero un borrador desde el Editor.</div>;
  return (
    <WidgetStudioHistory
      slug={business.slug}
      activeId={state.publishedVersionId}
      fallbackId={state.fallbackVersionId}
      versions={state.versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        checksum: version.checksum,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt.toISOString(),
        publishedBy: version.publishedBy,
      }))}
    />
  );
}
