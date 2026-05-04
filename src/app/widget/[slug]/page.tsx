import { prisma } from "@/server/db/prisma";
import { WidgetClient } from "./widget-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// ── Dynamic SEO per business ──
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, slug: true, logoUrl: true },
  });

  if (!business) {
    return { title: "Negocio no encontrado", description: "El negocio solicitado no existe en Puragenda." };
  }

  const title = `Reserva en ${business.name} | Puragenda`;
  const description = `Agenda tu cita en ${business.name} de forma rápida y segura. Reservas online 24/7 con confirmación inmediata.`;
  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const url = new URL(`/widget/${business.slug}`, baseUrl).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Puragenda",
      locale: "es_CL",
      type: "website",
      ...(business.logoUrl && { images: [{ url: business.logoUrl, width: 400, height: 400, alt: business.name }] }),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(business.logoUrl && { images: [business.logoUrl] }),
    },
    alternates: { canonical: url },
  };
}

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

  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const url = new URL(`/widget/${business.slug}`, baseUrl).toString();

  // LocalBusiness JSON-LD for local SEO
  const jsonLdLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url,
    ...(business.logoUrl && { image: business.logoUrl }),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: url,
        actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
      },
      result: {
        "@type": "Reservation",
        name: `Reserva en ${business.name}`,
      },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocalBusiness) }} />
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
    </>
  );
}
