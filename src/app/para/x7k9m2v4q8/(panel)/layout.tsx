import { getCurrentSessionUser } from "@/server/auth/user-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, BarChart3, Building2, CalendarClock, Users, CreditCard, Mail } from "lucide-react";
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
    <div className="flex min-h-screen bg-[#FFFAEB] font-sans">
      {/* SuperAdmin Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r-4 border-black bg-white">
        {/* Brand */}
        <div className="border-b-4 border-black p-5">
          <Link href={ADMIN_SECRET_PATH} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black shadow-[3px_3px_0_#7C3AED]">
              <Shield className="h-5 w-5 text-[#B28DFF]" />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-tight text-black">
                Super<span className="text-white">Admin</span>
              </span>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/50">Purocode · Admin</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-black/40">Plataforma</p>
          <NavLink href={ADMIN_SECRET_PATH} icon={BarChart3} label="Dashboard" />
          <NavLink href={`${ADMIN_SECRET_PATH}/businesses`} icon={Building2} label="Negocios" />
          <NavLink href={`${ADMIN_SECRET_PATH}/users`} icon={Users} label="Usuarios" />
          <NavLink href={`${ADMIN_SECRET_PATH}/subscriptions`} icon={CreditCard} label="Suscripciones" />
          <NavLink href={`${ADMIN_SECRET_PATH}/communications`} icon={Mail} label="Comunicaciones" />
          <div className="my-4 border-t-2 border-black/20" />
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-black/40">Accesos rápidos</p>
          <NavLink href="/dashboard" icon={CalendarClock} label="Mi Negocio" muted />
        </nav>

        {/* Admin identity */}
        <div className="border-t-4 border-black p-4 space-y-3">
          <div className="border-2 border-black bg-black/10 p-3 shadow-[3px_3px_0_#000]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3 w-3 text-black" />
              <p className="text-[10px] font-black uppercase tracking-widest text-black">Superadmin</p>
            </div>
            <p className="text-sm font-black text-black">{user.name}</p>
            <p className="text-[11px] font-bold text-black/60">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-auto">
        <div className="border-b-4 border-black bg-[#FFF5BA] px-8 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
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
      className={`flex items-center gap-3 border-2 border-black px-3 py-2.5 text-sm font-black uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
        muted
          ? "bg-black/10 text-black/60 shadow-[2px_2px_0_#000] hover:bg-black/20 hover:text-black"
          : "bg-black text-[#B28DFF] shadow-[3px_3px_0_#7C3AED] hover:bg-[#1a1a1a]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
