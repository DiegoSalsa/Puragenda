import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Shield, BarChart3 } from "lucide-react";
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
      {/* SuperAdmin Sidebar — visually distinct from client dashboard */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#7C3AED]/10 bg-[#08080C]">
        {/* Brand — uses gradient border to distinguish from dashboard */}
        <div className="border-b border-[#7C3AED]/10 p-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-lg shadow-[#7C3AED]/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                Super<span className="text-[#7C3AED]">Admin</span>
              </span>
              <p className="text-[10px] uppercase tracking-widest text-[#7C3AED]/50">Panel de control · PuroCode</p>
            </div>
          </Link>
        </div>

        {/* Admin-only navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#7C3AED]/40">Plataforma</p>
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/10 px-3 py-2.5 text-sm font-medium text-white"
          >
            <BarChart3 className="h-4 w-4" />
            Métricas Globales
          </Link>

          <div className="my-4 border-t border-white/[0.04]" />
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/20">Accesos rápidos</p>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-white/[0.03] hover:text-white/70"
          >
            <CalendarClock className="h-4 w-4" />
            Mi Negocio
          </Link>
        </nav>

        {/* Admin identity */}
        <div className="border-t border-[#7C3AED]/10 p-4">
          <div className="rounded-xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 to-[#5B21B6]/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[#7C3AED]" />
              <p className="text-[10px] uppercase tracking-widest text-[#7C3AED]">SuperAdmin</p>
            </div>
            <p className="mt-1 text-sm font-medium">{user.name}</p>
            <p className="text-[11px] text-white/30">{user.email}</p>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Content area with subtle top accent */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-[#7C3AED]/10 bg-gradient-to-r from-[#7C3AED]/5 to-transparent px-8 py-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#7C3AED]/60">
            Puragenda · Vista global de administración
          </p>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
