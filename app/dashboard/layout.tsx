import { DashboardSidebar } from "@/frontend/components/layout/dashboard-sidebar";
import { getCurrentSessionUser } from "@/backend/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/backend/services/business.service";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  const business = await getFirstBusinessByOwnerId(user.id);

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar userName={user.name} widgetSlug={business?.slug} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
