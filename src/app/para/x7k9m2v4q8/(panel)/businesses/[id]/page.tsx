
import { LocalizedText } from "@/components/i18n/localized-text";
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
  Share2,
  MapPin,
} from "@/components/icons/hover-icons";
import Link from "next/link";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { SubscriptionEditor } from "./subscription-editor";
import { DeleteBusinessButton } from "./delete-business-button";
import { ImpersonateButton } from "./impersonate-button";
import { absoluteUrl } from "@/lib/site";

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
      affiliate: {
        include: {
          referredBusinesses: {
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
              subscription: { select: { status: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      referredByAffiliate: {
        select: {
          referralCode: true,
          business: { select: { id: true, name: true } },
        },
      },
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
          className="mb-4 inline-flex items-center gap-1 text-sm font-black uppercase text-black hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> <LocalizedText id="JhxPoaC3z5e_" />
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center border-4 border-black bg-[#B28DFF] shadow-[4px_4px_0_#000]">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-black">{business.name}</h1>
              <p className="font-mono text-sm font-bold text-black/40">/{business.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`${ADMIN_SECRET_PATH}/marketplace/${business.id}`}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#000]"
            >
              <MapPin className="h-4 w-4" />
              Marketplace
            </Link>
            <ImpersonateButton businessId={business.id} />
            <DeleteBusinessButton businessId={business.id} businessName={business.name} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Owner */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Mail className="h-4 w-4" /> <LocalizedText id="q4vTSeOrpjxF" />
            </h3>
            {business.owner ? (
              <div className="space-y-2">
                {[
                  { label: "Nombre", value: business.owner.name },
                  { label: "Email", value: business.owner.email },
                  { label: "Rol", value: business.owner.role },
                  { label: "Registrado", value: format(new Date(business.owner.createdAt), "dd/MM/yyyy HH:mm", { locale: es }) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-black/40">{row.label}</span>
                    <span className="text-sm font-bold text-black">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-black/40"><LocalizedText id="EoRb_H-g01Mi" /></p>
            )}
          </div>

          {/* Staff */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Users className="h-4 w-4" /> <LocalizedText id="ZSo0EwUAEOqG" />{business.staff.length})
            </h3>
            <div className="space-y-2">
              {business.staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000]">
                  <div>
                    <p className="text-sm font-black text-black">{s.name}</p>
                    <p className="text-xs font-bold text-black/40">{s.email || "Sin email"}</p>
                  </div>
                  <span className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${s.isActive ? "bg-[#BFFCC6]" : "bg-[#FFB5E8]"}`}>
                    {s.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ))}
              {business.staff.length === 0 && <p className="py-4 text-center text-sm font-bold text-black/40"><LocalizedText id="dzZ1MpWkNLPc" /></p>}
            </div>
          </div>

          {/* Services */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Briefcase className="h-4 w-4" /> <LocalizedText id="Ano8TWhO0atr" />{business.services.length})
            </h3>
            <div className="space-y-2">
              {business.services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000]">
                  <div>
                    <p className="text-sm font-black text-black">{svc.name}</p>
                    <p className="text-xs font-bold text-black/40">{svc.duration} <LocalizedText id="H2-m9p0YXmCG" /></p>
                  </div>
                  <p className="font-black text-black">${svc.price.toLocaleString("es-CL")}</p>
                </div>
              ))}
              {business.services.length === 0 && <p className="py-4 text-center text-sm font-bold text-black/40"><LocalizedText id="9hE0hsT-qFzZ" /></p>}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Calendar className="h-4 w-4" /> <LocalizedText id="fsQ34d9KEetZ" />{business._count.appointments} <LocalizedText id="ZlwChXJ9c2rq" />
            </h3>
            <div className="space-y-2">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-3 shadow-[2px_2px_0_#000]">
                  <div>
                    <p className="text-sm font-black text-black">{apt.customerName}</p>
                    <p className="text-xs font-bold text-black/40">
                      {apt.service.name} · {apt.staff?.name || "Sin asignar"} · {format(new Date(apt.startTime), "dd/MM HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                    apt.status === "CONFIRMED" ? "bg-[#BFFCC6]"
                    : apt.status === "PENDING" ? "bg-[#FFF5BA]"
                    : apt.status === "CANCELLED" ? "bg-[#FFB5E8]"
                    : apt.status === "CHECKED_IN" ? "bg-[#85E3FF]"
                    : "bg-black/10"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
              {recentAppointments.length === 0 && <p className="py-4 text-center text-sm font-bold text-black/40"><LocalizedText id="ze8bGLfz4ge3" /></p>}
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
            <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
              <p className="text-sm font-bold text-black/40"><LocalizedText id="FihAURvq5ieW" /></p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="border-4 border-black bg-[#85E3FF] p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black"><LocalizedText id="7XvcZ8hLPta7" /></h3>
            <div className="space-y-3">
              {[
                { label: "Clientes", value: business._count.clients, icon: Users },
                { label: "Citas totales", value: business._count.appointments, icon: Calendar },
                { label: "Profesionales", value: business.staff.length, icon: Users },
                { label: "Servicios", value: business.services.length, icon: Briefcase },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span className="flex items-center gap-2 text-xs font-black uppercase text-black/60">
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </span>
                  <span className="text-lg font-black text-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget Info */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Palette className="h-4 w-4" /> <LocalizedText id="fdeijC_54wir" />
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="lj5T0HoHYtu1" /></span>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-black" style={{ backgroundColor: business.primaryColor }} />
                  <span className="font-mono text-xs font-bold text-black">{business.primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="S-XlACNsnZRw" /></span>
                <a href={absoluteUrl(`/widget/${business.slug}`)} target="_blank" rel="noreferrer" className="font-mono text-xs font-bold text-black underline decoration-2 underline-offset-2">{absoluteUrl(`/widget/${business.slug}`)}</a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="IxidVfaXPyzl" /></span>
                <span className="font-mono text-xs font-bold text-black/50">{business.apiKey.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          {/* Referral Info */}
          <div className="border-4 border-black bg-white p-6 shadow-[4px_4px_0_#000]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
              <Share2 className="h-4 w-4" /> <LocalizedText id="wgPakJ2NbGW3" />
            </h3>
            <div className="space-y-3">
              {business.affiliate ? (
                <>
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="9YuFVwOYwMyd" /></span>
                    <span className="font-mono text-sm font-black text-black">{business.affiliate.referralCode}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="QqIeCLd-4KlO" /></span>
                    <span className="text-sm font-black text-black">{business.affiliate.paidReferrals}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="JZ2y1viU1_Gm" /></span>
                    <span className="text-sm font-black text-black">{business.affiliate.spentTokens}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-black/40"><LocalizedText id="UU_47MkYsLmU" /></span>
                    <span className="text-sm font-black text-black">{business.affiliate.paidReferrals - business.affiliate.spentTokens}</span>
                  </div>
                  {business.affiliate.referredBusinesses.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-black uppercase text-black/40"><LocalizedText id="OXlU7jhQGTi4" /></p>
                      <div className="space-y-1.5">
                        {business.affiliate.referredBusinesses.map((ref) => (
                          <Link
                            key={ref.id}
                            href={`${ADMIN_SECRET_PATH}/businesses/${ref.id}`}
                            className="flex items-center justify-between border-2 border-black bg-[#FFFAEB] p-2.5 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                          >
                            <div>
                              <p className="text-xs font-black text-black">{ref.name}</p>
                              <p className="text-[10px] font-bold text-black/40">/{ref.slug}</p>
                            </div>
                            <span className={`border border-black px-1.5 py-0.5 text-[10px] font-black uppercase ${
                              ref.subscription?.status === "ACTIVE" ? "bg-[#BFFCC6]" : ref.subscription?.status === "TRIALING" ? "bg-[#FFF5BA]" : "bg-[#FFB5E8]"
                            }`}>
                              {ref.subscription?.status || "N/A"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-black/40"><LocalizedText id="1bfUHPBEy5h4" /></p>
              )}
              {business.referredByAffiliate && (
                <div className="border-t-2 border-black/10 pt-3">
                  <p className="text-xs font-black uppercase text-black/40 mb-1"><LocalizedText id="eirgSz1lhR8W" /></p>
                  <Link
                    href={`${ADMIN_SECRET_PATH}/businesses/${business.referredByAffiliate.business.id}`}
                    className="inline-flex items-center gap-1.5 border-2 border-black bg-[#B28DFF] px-2.5 py-1.5 text-xs font-black text-black shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                  >
                    <Building2 className="h-3 w-3" />
                    {business.referredByAffiliate.business.name}
                    <span className="font-mono text-[10px] opacity-60">({business.referredByAffiliate.referralCode})</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
