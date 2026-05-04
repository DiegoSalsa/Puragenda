import { prisma } from "@/server/db/prisma";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      subscription: true,
      _count: {
        select: { staff: true, services: true, appointments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Negocios</h1>
            <p className="text-sm text-[#888]">{businesses.length} negocios registrados</p>
          </div>
        </div>
        <Link
          href={`${ADMIN_SECRET_PATH}/businesses/new`}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#7C3AED]/20"
        >
          <Plus className="h-4 w-4" />
          Agregar Negocio
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e12]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-[#666]">
                <th className="px-6 py-4 pr-4">Negocio</th>
                <th className="px-4 py-4">Dueño</th>
                <th className="px-4 py-4">Plan</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-4 py-4">Staff</th>
                <th className="px-4 py-4">Servicios</th>
                <th className="px-4 py-4">Citas</th>
                <th className="px-4 py-4">Creado</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((biz) => {
                const sub = biz.subscription;
                const daysLeft =
                  sub?.isTrial && sub?.trialEndsAt
                    ? differenceInDays(new Date(sub.trialEndsAt), new Date())
                    : null;

                return (
                  <tr
                    key={biz.id}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4 pr-4">
                      <div>
                        <p className="font-medium text-white">{biz.name}</p>
                        <p className="font-mono text-xs text-[#555]">/{biz.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-white">{biz.owner?.name || "—"}</p>
                        <p className="text-xs text-[#555]">{biz.owner?.email || ""}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${
                          sub?.plan === "EQUIPO"
                            ? "border border-[#7C3AED]/20 bg-[#7C3AED]/10 text-[#A78BFA]"
                            : "border border-white/[0.08] bg-[#1a1a22] text-[#888]"
                        }`}
                      >
                        {sub?.plan === "EQUIPO" ? "Equipo" : sub?.plan === "INDIVIDUAL" ? "Individual" : sub?.plan || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                          sub?.status === "ACTIVE"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : sub?.status === "TRIALING"
                            ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : sub?.status === "CANCELLED"
                            ? "border border-red-500/20 bg-red-500/10 text-red-400"
                            : "border border-white/[0.08] bg-[#1a1a22] text-[#666]"
                        }`}
                      >
                        {sub?.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                        {sub?.status === "TRIALING" && <Clock className="h-3 w-3" />}
                        {sub?.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                        {sub?.status === "INACTIVE" && <AlertTriangle className="h-3 w-3" />}
                        {sub?.status || "—"}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className="ml-1 text-[10px] opacity-70">({daysLeft}d)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-[#888]">
                      {biz._count.staff}
                    </td>
                    <td className="px-4 py-4 text-center text-[#888]">
                      {biz._count.services}
                    </td>
                    <td className="px-4 py-4 text-center text-[#888]">
                      {biz._count.appointments}
                    </td>
                    <td className="px-4 py-4 text-[#555]">
                      {format(new Date(biz.createdAt), "dd/MM/yy", {
                        locale: es,
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`${ADMIN_SECRET_PATH}/businesses/${biz.id}`}
                        className="flex items-center gap-1 rounded-lg border border-[#7C3AED]/20 bg-[#7C3AED]/8 px-3 py-1.5 text-xs font-medium text-[#A78BFA] transition-all hover:bg-[#7C3AED]/15"
                      >
                        Detalle <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {businesses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-10 w-10 text-[#333]" />
              <p className="mt-3 text-sm text-[#666]">No hay negocios registrados aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
