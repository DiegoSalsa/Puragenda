import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  ArrowLeft,
  Users,
  Briefcase,
  Calendar,
  Mail,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { SubscriptionEditor } from "./subscription-editor";
import { DeleteBusinessButton } from "./delete-business-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      subscription: true,
      staff: {
        select: { id: true, name: true, email: true, isActive: true },
        orderBy: { createdAt: "asc" },
      },
      services: {
        select: { id: true, name: true, duration: true, price: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { appointments: true, clients: true } },
    },
  });

  if (!business) notFound();

  const sub = business.subscription;

  // Recent appointments
  const recentAppointments = await prisma.appointment.findMany({
    where: { businessId: id },
    take: 5,
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      customerName: true,
      startTime: true,
      status: true,
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`${ADMIN_SECRET_PATH}/businesses`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#7C3AED] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a negocios
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{business.name}</h1>
              <p className="font-mono text-sm text-[#555]">/{business.slug}</p>
            </div>
          </div>
          <DeleteBusinessButton businessId={business.id} businessName={business.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Owner */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
              <Mail className="h-4 w-4" /> Dueño
            </h3>
            {business.owner ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Nombre</span>
                  <span className="text-sm font-medium text-white">{business.owner.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Email</span>
                  <span className="text-sm text-[#A78BFA]">{business.owner.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Rol</span>
                  <span className="text-sm text-[#888]">{business.owner.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">Registrado</span>
                  <span className="text-sm text-[#888]">
                    {format(new Date(business.owner.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">Sin dueño asignado</p>
            )}
          </div>

          {/* Staff */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
              <Users className="h-4 w-4" /> Profesionales ({business.staff.length})
            </h3>
            <div className="space-y-2">
              {business.staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#141418] p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-[#555]">{s.email || "Sin email"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border border-red-500/20 bg-red-500/10 text-red-400"}`}>
                    {s.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ))}
              {business.staff.length === 0 && <p className="py-4 text-center text-sm text-[#666]">Sin profesionales</p>}
            </div>
          </div>

          {/* Services */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
              <Briefcase className="h-4 w-4" /> Servicios ({business.services.length})
            </h3>
            <div className="space-y-2">
              {business.services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#141418] p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{svc.name}</p>
                    <p className="text-xs text-[#555]">{svc.duration} min</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-white">${svc.price.toLocaleString("es-CL")}</p>
                </div>
              ))}
              {business.services.length === 0 && <p className="py-4 text-center text-sm text-[#666]">Sin servicios</p>}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
              <Calendar className="h-4 w-4" /> Citas Recientes ({business._count.appointments} total)
            </h3>
            <div className="space-y-2">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#141418] p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{apt.customerName}</p>
                    <p className="text-xs text-[#555]">
                      {apt.service.name} · {apt.staff?.name || "Sin asignar"} · {format(new Date(apt.startTime), "dd/MM HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    apt.status === "CONFIRMED" ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : apt.status === "PENDING" ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : apt.status === "CANCELLED" ? "border border-red-500/20 bg-red-500/10 text-red-400"
                    : apt.status === "CHECKED_IN" ? "border border-blue-500/20 bg-blue-500/10 text-blue-400"
                    : "border border-white/[0.08] bg-[#1a1a22] text-[#666]"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
              {recentAppointments.length === 0 && <p className="py-4 text-center text-sm text-[#666]">Sin citas</p>}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {sub ? (
            <SubscriptionEditor subscription={{
              id: sub.id,
              plan: sub.plan,
              status: sub.status,
              billingCycle: sub.billingCycle,
              isTrial: sub.isTrial,
              trialEndsAt: sub.trialEndsAt?.toISOString() || null,
              extraStaffCount: sub.extraStaffCount,
              createdAt: sub.createdAt.toISOString(),
            }} />
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
              <p className="text-sm text-[#666]">Sin suscripción</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">Resumen</h3>
            <div className="space-y-3">
              {[
                { label: "Clientes", value: business._count.clients, icon: Users },
                { label: "Citas totales", value: business._count.appointments, icon: Calendar },
                { label: "Profesionales", value: business.staff.length, icon: Users },
                { label: "Servicios", value: business.services.length, icon: Briefcase },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-[#666]">
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </span>
                  <span className="text-sm font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget Info */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
              <Palette className="h-4 w-4" /> Widget
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">Color primario</span>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: business.primaryColor }} />
                  <span className="font-mono text-xs text-[#888]">{business.primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">URL del widget</span>
                <span className="font-mono text-xs text-[#A78BFA]">/widget/{business.slug}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">API Key</span>
                <span className="font-mono text-xs text-[#555]">{business.apiKey.slice(0, 12)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
