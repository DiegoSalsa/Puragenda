import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, LayoutDashboard, Shield } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSessionUser();

  if (!user || !user.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0E0E0E]">
        <div className="border-b border-white/[0.06] p-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-lg shadow-[#7C3AED]/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                Super<span className="text-[#7C3AED]">Admin</span>
              </span>
              <p className="text-[10px] uppercase tracking-widest text-white/30">PuroCode</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-2.5 text-sm font-medium text-white"
          >
            <LayoutDashboard className="h-4 w-4" />
            Panel de Control
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/[0.03] hover:text-white/80"
          >
            <CalendarClock className="h-4 w-4" />
            Mi Negocio
          </Link>
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-[#7C3AED]">SuperAdmin</p>
            <p className="mt-0.5 text-sm font-medium">{user.name}</p>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
