import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { format, differenceInDays, startOfWeek, endOfWeek, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  DollarSign,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  CalendarPlus,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = startOfMonth(now);

  const [
    totalBusinesses,
    subscriptions,
    totalUsers,
    recentBusinesses,
    weeklyAppointments,
    topBusinessesByAppointments,
    lastMonthSubs,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.subscription.findMany({
      include: {
        business: {
          select: {
            name: true,
            slug: true,
            createdAt: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
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
    prisma.appointment.count({
      where: { startTime: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.business.findMany({
      take: 5,
      orderBy: { appointments: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { appointments: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
    prisma.subscription.findMany({
      where: {
        plan: { in: ["INDIVIDUAL", "EQUIPO"] },
        status: "ACTIVE",
        isTrial: false,
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      select: { plan: true },
    }),
  ]);

  const activeBusinesses = subscriptions.filter(
    (s) => s.status === "ACTIVE" || s.status === "TRIALING"
  ).length;

  const trialBusinesses = subscriptions.filter((s) => s.status === "TRIALING").length;

  const paidIndividual = subscriptions.filter(
    (s) => s.plan === "INDIVIDUAL" && s.status === "ACTIVE" && !s.isTrial
  ).length;

  const paidEquipo = subscriptions.filter(
    (s) => s.plan === "EQUIPO" && s.status === "ACTIVE" && !s.isTrial
  ).length;

  const estimatedMRR =
    paidIndividual * PRICING.INDIVIDUAL.monthly +
    paidEquipo * PRICING.EQUIPO.monthly;

  const lastMonthIndividual = lastMonthSubs.filter((s) => s.plan === "INDIVIDUAL").length;
  const lastMonthEquipo = lastMonthSubs.filter((s) => s.plan === "EQUIPO").length;
  const lastMonthMRR =
    lastMonthIndividual * PRICING.INDIVIDUAL.monthly +
    lastMonthEquipo * PRICING.EQUIPO.monthly;
  const mrrDelta = estimatedMRR - lastMonthMRR;

  const paidActive = paidIndividual + paidEquipo;
  const everConverted = subscriptions.filter(
    (s) => s.status === "ACTIVE" && !s.isTrial
  ).length;
  const totalEverTrialed = subscriptions.filter((s) => s.isTrial).length;
  const conversionRate =
    totalEverTrialed > 0
      ? ((everConverted / (totalEverTrialed + paidActive)) * 100).toFixed(1)
      : "—";

  const newLast7Days = subscriptions.filter(
    (s) => differenceInDays(now, new Date(s.business.createdAt)) <= 7
  ).length;

  const expiringTrials = subscriptions
    .filter(
      (s) =>
        s.isTrial &&
        s.status === "TRIALING" &&
        s.trialEndsAt &&
        differenceInDays(new Date(s.trialEndsAt), now) <= 5 &&
        differenceInDays(new Date(s.trialEndsAt), now) >= 0
    )
    .sort((a, b) => new Date(a.trialEndsAt!).getTime() - new Date(b.trialEndsAt!).getTime());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Panel SuperAdmin</h1>
          <p className="text-sm font-bold text-black/50 uppercase tracking-wide mt-1">
            Puragenda · métricas en tiempo real
          </p>
        </div>
        <Link
          href={`${ADMIN_SECRET_PATH}/businesses/new`}
          className="flex items-center gap-2 border-4 border-black bg-[#B28DFF] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
        >
          <CalendarPlus className="h-4 w-4" />
          Agregar Negocio
        </Link>
      </div>

      {/* Stats Grid — 4 principales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "MRR Estimado",
            value: `$${estimatedMRR.toLocaleString("es-CL")}`,
            sub: mrrDelta >= 0
              ? `+$${mrrDelta.toLocaleString("es-CL")} vs mes anterior`
              : `-$${Math.abs(mrrDelta).toLocaleString("es-CL")} vs mes anterior`,
            icon: DollarSign,
            bg: "bg-[#BFFCC6]",
          },
          {
            label: "Negocios Activos",
            value: activeBusinesses,
            sub: `${totalBusinesses} totales registrados`,
            icon: Building2,
            bg: "bg-[#85E3FF]",
          },
          {
            label: "En Trial",
            value: trialBusinesses,
            sub: expiringTrials.length > 0 ? `${expiringTrials.length} expiran en ≤5 días` : "Sin urgencias",
            icon: Clock,
            bg: "bg-[#FFF5BA]",
          },
          {
            label: "Usuarios",
            value: totalUsers,
            sub: `Tasa de conv: ${conversionRate}%`,
            icon: Users,
            bg: "bg-[#FFB5E8]",
          },
        ].map((stat) => (
          <div key={stat.label} className={`border-4 border-black ${stat.bg} p-5 shadow-[6px_6px_0_#000]`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-black/60">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-black/50" />
            </div>
            <p className="text-4xl font-black text-black tracking-tighter">{stat.value}</p>
            <p className="mt-1 text-xs font-bold text-black/50">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="h-4 w-4 text-black/50" />
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Citas esta semana</p>
          </div>
          <p className="text-4xl font-black text-black tracking-tighter">{weeklyAppointments}</p>
          <p className="mt-1 text-xs font-bold text-black/50">
            {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM", { locale: es })}
          </p>
        </div>
        <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-black/50" />
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Pagando hoy</p>
          </div>
          <p className="text-4xl font-black text-black tracking-tighter">{paidActive}</p>
          <p className="mt-1 text-xs font-bold text-black/50">
            {paidIndividual} Individual · {paidEquipo} Equipo
          </p>
        </div>
        <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-black/50" />
            <p className="text-xs font-black uppercase tracking-widest text-black/60">Nuevos esta semana</p>
          </div>
          <p className="text-4xl font-black text-black tracking-tighter">{newLast7Days}</p>
          <p className="mt-1 text-xs font-bold text-black/50">Registros últimos 7 días</p>
        </div>
      </div>

      {/* Revenue Breakdown + Trials expirando pronto */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-black">
            <Sparkles className="h-4 w-4" />
            Desglose de Revenue
          </h3>
          <div className="space-y-3">
            {[
              { name: "Individual", count: paidIndividual, price: PRICING.INDIVIDUAL.monthly, bg: "bg-[#FFF5BA]" },
              { name: "Plan Equipo", count: paidEquipo, price: PRICING.EQUIPO.monthly, bg: "bg-[#B28DFF]" },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex items-center justify-between border-2 border-black ${item.bg} p-3 shadow-[2px_2px_0_#000]`}
              >
                <div>
                  <p className="text-sm font-black text-black">{item.name}</p>
                  <p className="text-xs font-bold text-black/50">
                    {item.count} × ${item.price.toLocaleString("es-CL")}
                  </p>
                </div>
                <p className="font-black text-lg text-black">
                  ${(item.count * item.price).toLocaleString("es-CL")}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-2 border-black bg-black p-3">
              <p className="text-sm font-black text-white uppercase">Total MRR</p>
              <p className="font-black text-lg text-[#BFFCC6]">
                ${estimatedMRR.toLocaleString("es-CL")}
              </p>
            </div>
          </div>
        </div>

        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0_#000] space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-black">
            <AlertTriangle className="h-4 w-4" />
            Trials por expirar (≤5 días)
          </h3>
          <div className="space-y-2">
            {expiringTrials.length === 0 ? (
              <div className="border-2 border-black bg-[#BFFCC6] p-4">
                <p className="text-sm font-black text-black/60 text-center">Sin urgencias por ahora</p>
              </div>
            ) : (
              expiringTrials.slice(0, 5).map((s) => {
                const daysLeft = differenceInDays(new Date(s.trialEndsAt!), now);
                return (
                  <Link
                    key={s.id}
                    href={`${ADMIN_SECRET_PATH}/businesses/${s.businessId}`}
                    className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    <div>
                      <p className="text-sm font-black text-black">{s.business.name}</p>
                      <p className="text-xs font-bold text-black/40">{s.business.owner?.email || "sin email"}</p>
                    </div>
                    <span
                      className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                        daysLeft <= 2 ? "bg-[#FFB5E8]" : "bg-[#FFF5BA]"
                      }`}
                    >
                      {daysLeft === 0 ? "Hoy!" : `${daysLeft}d`}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top 5 negocios por citas + Registros recientes */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 5 by appointments */}
        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black p-5 bg-[#85E3FF]">
            <h2 className="text-base font-black uppercase tracking-tight text-black">Top 5 por Citas</h2>
            <p className="text-xs font-bold text-black/50">Total histórico de appointments</p>
          </div>
          <div className="p-4 space-y-2">
            {topBusinessesByAppointments.map((biz, i) => (
              <Link
                key={biz.id}
                href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`}
                className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center border-2 border-black bg-black text-xs font-black text-[#B28DFF]">
                    #{i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-black">{biz.name}</p>
                    <p className="text-xs font-bold text-black/40">/{biz.slug}</p>
                  </div>
                </div>
                <span className="border-2 border-black bg-[#85E3FF] px-2 py-0.5 text-xs font-black">
                  {biz._count.appointments} citas
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent registrations */}
        <div className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="flex items-center justify-between border-b-4 border-black p-5 bg-[#FFF5BA]">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-black">Registros Recientes</h2>
              <p className="text-xs font-bold text-black/50">{newLast7Days} nuevos en los últimos 7 días</p>
            </div>
            <Link
              href={`${ADMIN_SECRET_PATH}/businesses`}
              className="flex items-center gap-1 border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#7C3AED] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {recentBusinesses.map((biz) => (
              <Link
                key={biz.id}
                href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`}
                className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#B28DFF] text-black shadow-[2px_2px_0_#000]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-black">{biz.name}</p>
                    <p className="text-xs font-bold text-black/40">
                      {format(new Date(biz.createdAt), "dd/MM/yy", { locale: es })}
                    </p>
                  </div>
                </div>
                {biz.subscription && (
                  <span
                    className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                      biz.subscription.status === "TRIALING"
                        ? "bg-[#FFF5BA]"
                        : biz.subscription.status === "ACTIVE"
                        ? "bg-[#BFFCC6]"
                        : "bg-[#FFB5E8]"
                    }`}
                  >
                    {biz.subscription.status}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
