import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getFirstBusinessByOwnerId } from "@/server/services/business.service";
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
    <div className="flex min-h-screen">
      <DashboardSidebar
        userName={user.name}
        widgetSlug={business?.slug}
        userRole={user.role}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
