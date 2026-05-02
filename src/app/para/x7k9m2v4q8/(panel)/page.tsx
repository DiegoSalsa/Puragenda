import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { format, differenceInDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUpRight,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalBusinesses, subscriptions, totalUsers, totalAppointments, recentBusinesses] =
    await Promise.all([
      prisma.business.count(),
      prisma.subscription.findMany({
        include: {
          business: {
            select: {
              name: true,
              slug: true,
              createdAt: true,
              owner: { select: { name: true, email: true } },
              _count: { select: { staff: true, appointments: true, services: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.business.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          owner: { select: { name: true, email: true } },
          subscription: { select: { plan: true, status: true, isTrial: true } },
        },
      }),
    ]);

  const activeBusinesses = subscriptions.filter(
    (s) => s.status === "ACTIVE" || s.status === "TRIALING"
  ).length;

  const trialBusinesses = subscriptions.filter(
    (s) => s.status === "TRIALING"
  ).length;

  const paidIndividual = subscriptions.filter(
    (s) => s.plan === "INDIVIDUAL" && s.status === "ACTIVE" && !s.isTrial
  ).length;

  const paidBasic = subscriptions.filter(
    (s) => s.plan === "BASIC" && s.status === "ACTIVE" && !s.isTrial
  ).length;

  const paidPro = subscriptions.filter(
    (s) => s.plan === "PRO" && s.status === "ACTIVE"
  ).length;

  const estimatedMRR =
    paidIndividual * PRICING.INDIVIDUAL.monthly +
    paidBasic * PRICING.BASIC.monthly +
    paidPro * PRICING.PRO.monthly;

  // New businesses last 7 days
  const newLast7Days = subscriptions.filter(
    (s) => differenceInDays(new Date(), new Date(s.business.createdAt)) <= 7
  ).length;

  const stats = [
    {
      label: "MRR Estimado",
      value: `$${estimatedMRR.toLocaleString("es-CL")}`,
      sub: "Ingresos mensuales recurrentes",
      icon: DollarSign,
      gradient: true,
    },
    {
      label: "Negocios Activos",
      value: activeBusinesses,
      sub: `${totalBusinesses} totales registrados`,
      icon: Building2,
    },
    {
      label: "En Trial",
      value: trialBusinesses,
      sub: "Pruebas gratuitas activas",
      icon: Clock,
    },
    {
      label: "Usuarios",
      value: totalUsers,
      sub: `${totalAppointments} citas procesadas`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Panel SuperAdmin</h1>
            <p className="text-sm text-[#888]">
              Vista global de Puragenda · métricas en tiempo real
            </p>
          </div>
        </div>
        <Link
          href={`${ADMIN_SECRET_PATH}/businesses/new`}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20"
        >
          <CalendarPlus className="h-4 w-4" />
          Agregar Negocio
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-6 transition-all ${
              stat.gradient
                ? "border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/10 to-[#5B21B6]/5"
                : "border-white/[0.06] bg-[#0e0e12]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#888]">{stat.label}</p>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.gradient ? "text-[#7C3AED]" : "text-[#666]"
                }`}
              />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-[#666]">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown + Trials */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium text-white">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            Desglose de Revenue
          </h3>
          <div className="mt-4 space-y-3">
            {[
              { name: "Individual", count: paidIndividual, price: PRICING.INDIVIDUAL.monthly },
              { name: "Plan Base", count: paidBasic, price: PRICING.BASIC.monthly },
              { name: "Plan Pro", count: paidPro, price: PRICING.PRO.monthly },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#141418] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-[#666]">
                    {item.count} × ${item.price.toLocaleString("es-CL")}
                  </p>
                </div>
                <p className="font-mono text-sm font-bold text-white">
                  ${(item.count * item.price).toLocaleString("es-CL")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium text-white">
            <Clock className="h-4 w-4 text-[#7C3AED]" />
            Trials Activos
          </h3>
          <div className="mt-4 space-y-2">
            {subscriptions
              .filter((s) => s.isTrial && s.status === "TRIALING")
              .slice(0, 5)
              .map((s) => {
                const daysLeft = s.trialEndsAt
                  ? differenceInDays(new Date(s.trialEndsAt), new Date())
                  : 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#141418] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{s.business.name}</p>
                      <p className="text-xs text-[#666]">/{s.business.slug}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        daysLeft <= 5
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : "border border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#A78BFA]"
                      }`}
                    >
                      {daysLeft > 0 ? `${daysLeft}d restantes` : "Expirado"}
                    </span>
                  </div>
                );
              })}
            {subscriptions.filter((s) => s.isTrial && s.status === "TRIALING")
              .length === 0 && (
              <p className="py-4 text-center text-sm text-[#666]">
                No hay trials activos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12]">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Registros Recientes</h2>
            <p className="text-xs text-[#666]">{newLast7Days} nuevos en los últimos 7 días</p>
          </div>
          <Link
            href={`${ADMIN_SECRET_PATH}/businesses`}
            className="flex items-center gap-1 text-sm text-[#7C3AED] hover:underline"
          >
            Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="p-6">
          <div className="space-y-2">
            {recentBusinesses.map((biz) => (
              <Link
                key={biz.id}
                href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#141418] p-4 transition-all hover:border-[#7C3AED]/20 hover:bg-[#7C3AED]/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a22] text-[#7C3AED]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{biz.name}</p>
                    <p className="text-xs text-[#666]">
                      {biz.owner?.name || "Sin dueño"} · {biz.owner?.email || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {biz.subscription && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                        biz.subscription.status === "TRIALING"
                          ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                          : biz.subscription.status === "ACTIVE"
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border border-white/[0.06] bg-[#1a1a22] text-[#666]"
                      }`}
                    >
                      {biz.subscription.plan} · {biz.subscription.status}
                    </span>
                  )}
                  <span className="text-xs text-[#555]">
                    {format(new Date(biz.createdAt), "dd/MM/yy", { locale: es })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
