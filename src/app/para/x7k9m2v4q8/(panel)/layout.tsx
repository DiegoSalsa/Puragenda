import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { AdminPanelShell } from "./admin-panel-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();

  if (!user || !user.isSuperAdmin) {
    redirect(`${ADMIN_SECRET_PATH}/login`);
  }

  return (
    <AdminPanelShell userName={user.name} userEmail={user.email}>
      {children}
    </AdminPanelShell>
  );
}
