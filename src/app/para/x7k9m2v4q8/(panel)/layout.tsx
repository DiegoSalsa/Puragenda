import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, BarChart3, Building2, CreditCard, CalendarClock } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ADMIN_SECRET_PATH } from "@/core/constants";

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
    <div className="flex min-h-screen bg-[#050508]">
      {/* SuperAdmin Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#7C3AED]/8 bg-[#0a0a0f]">
        {/* Brand */}
        <div className="border-b border-[#7C3AED]/8 p-6">
          <Link href={ADMIN_SECRET_PATH} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] shadow-lg shadow-[#7C3AED]/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Super<span className="text-[#7C3AED]">Admin</span>
              </span>
              <p className="text-[10px] uppercase tracking-widest text-[#7C3AED]/50">Panel de control · PuroCode</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#7C3AED]/40">Plataforma</p>
          <NavLink href={ADMIN_SECRET_PATH} icon={BarChart3} label="Dashboard" />
          <NavLink href={`${ADMIN_SECRET_PATH}/businesses`} icon={Building2} label="Negocios" />

          <div className="my-4 border-t border-white/[0.04]" />
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#666]">Accesos rápidos</p>
          <NavLink href="/dashboard" icon={CalendarClock} label="Mi Negocio" muted />
        </nav>

        {/* Admin identity */}
        <div className="border-t border-[#7C3AED]/8 p-4">
          <div className="rounded-xl border border-[#7C3AED]/15 bg-gradient-to-br from-[#7C3AED]/8 to-[#5B21B6]/4 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[#7C3AED]" />
              <p className="text-[10px] uppercase tracking-widest text-[#7C3AED]">SuperAdmin</p>
            </div>
            <p className="mt-1 text-sm font-medium text-white">{user.name}</p>
            <p className="text-[11px] text-[#888]">{user.email}</p>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-[#7C3AED]/8 bg-gradient-to-r from-[#7C3AED]/4 to-transparent px-8 py-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#7C3AED]/50">
            Puragenda · Vista global de administración
          </p>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  muted,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        muted
          ? "border border-transparent text-[#888] hover:bg-white/[0.03] hover:text-white"
          : "border border-[#7C3AED]/15 bg-[#7C3AED]/8 text-white hover:bg-[#7C3AED]/12"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
