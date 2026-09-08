import { getCurrentAdminSessionUser, listSuperAdminSessions } from "@/server/auth/admin-session";
import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { AdminPanelShell } from "./admin-panel-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAdminSessionUser();

  if (!user) {
    redirect(`${ADMIN_SECRET_PATH}/login`);
  }

  const sessions = await listSuperAdminSessions(user.id, user.sessionId);

  return (
    <AdminPanelShell
      userName={user.name}
      userEmail={user.email}
      sessions={sessions.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        lastUsedAt: session.lastUsedAt.toISOString(),
        current: session.current,
      }))}
    >
      {children}
    </AdminPanelShell>
  );
}
