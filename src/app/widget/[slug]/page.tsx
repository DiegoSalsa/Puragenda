import { prisma } from "@/server/db/prisma";
import { WidgetClient } from "./widget-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    color?: string; primary?: string; secondary?: string;
    bg?: string; text?: string; textSecondary?: string; fontSize?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: { orderBy: { name: "asc" } },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      staff: {
        where: { isActive: true },
        include: {
          schedule: { orderBy: { dayOfWeek: "asc" } },
          services: { select: { id: true } },
        },
      },
    },
  });

  if (!business) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center p-5" style={{ background: "#000" }}>
        <div className="w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#111] p-8 text-center">
          <p className="text-xl font-semibold text-white">Negocio no encontrado</p>
          <p className="mt-2 text-sm text-white/40">El identificador &ldquo;{slug}&rdquo; no existe.</p>
        </div>
      </div>
    );
  }

  // Color cascade: URL params > DB values > defaults
  const primaryHex = business.primaryColor.replace("#", "");
  const widgetColor = sp.primary || sp.color || business.brandColor || primaryHex || "7C3AED";
  const secondaryColor = sp.secondary ? `#${sp.secondary}` : business.secondaryColor;
  const bgColor = sp.bg ? `#${sp.bg}` : business.backgroundColor;
  const textColor = sp.text ? `#${sp.text}` : (business.textColor || "#FFFFFF");
  const textMuted = sp.textSecondary ? `#${sp.textSecondary}` : (business.textMutedColor || `${textColor}66`);
  const fontSize = sp.fontSize ? parseInt(sp.fontSize, 10) : (business.widgetFontSize || 14);

  return (
    <WidgetClient
      business={{
        name: business.name,
        slug: business.slug,
        apiKey: business.apiKey,
        logoUrl: business.logoUrl,
        primaryColor: `#${widgetColor}`,
        secondaryColor,
        backgroundColor: bgColor,
        brandColor: widgetColor,
        textColor,
        textSecondary: textMuted,
        fontSize,
      }}
      services={business.services.map((s) => ({
        id: s.id, name: s.name, description: s.description, duration: s.duration, price: s.price,
      }))}
      primaryColor={widgetColor}
      businessHours={business.businessHours.map((h) => ({
        dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen,
      }))}
      staffMembers={business.staff.map((s) => ({
        id: s.id,
        name: s.name,
        serviceIds: s.services.map((sv) => sv.id),
        schedule: s.schedule.map((sc) => ({
          dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking,
        })),
      }))}
      maxServicesPerBooking={business.maxServicesPerBooking}
    />
  );
}
