
import { LocalizedText } from "@/components/i18n/localized-text";
import { prisma } from "@/server/db/prisma";
import { WidgetClient } from "./widget-client";
import type { Metadata, Viewport } from "next";
import { getCountryConfig } from "@/core/countries";

export const dynamic = "force-dynamic";

export async function generateViewport({ params, searchParams }: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bg?: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const sp = await searchParams;
  
  if (sp.bg) {
    return { themeColor: `#${sp.bg}` };
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { backgroundColor: true },
  });

  return {
    themeColor: business?.backgroundColor || "#0A0A0A",
  };
}

// ── Dynamic SEO per business ──
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true, slug: true, logoUrl: true, countryCode: true },
  });

  if (!business) {
    return { title: "Negocio no encontrado", description: "El negocio solicitado no existe en Puragenda." };
  }

  const title = `Reserva en ${business.name}`;
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
      locale: getCountryConfig(business.countryCode).locale.replace("-", "_"),
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
    radius?: string; shadow?: string; headerAlign?: string; location?: string;
    service?: string; staff?: string; date?: string; story?: string;
    preview?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const previewMode = sp.preview === "1";

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          category: true,
          recurringPlan: true,
          optionCategories: {
            orderBy: { position: "asc" },
            include: { alternatives: { orderBy: { position: "asc" } } },
          },
          locations: { select: { locationId: true } },
        },
      },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      staff: {
        where: { isActive: true },
        include: {
          schedule: { orderBy: { dayOfWeek: "asc" } },
          scheduleOverrides: { orderBy: { date: "asc" } },
          services: { select: { id: true } },
          locations: { where: { isActive: true }, select: { locationId: true, schedule: { orderBy: { dayOfWeek: "asc" } } } },
        },
      },
      widgetPromoBlocks: {
        where: { isVisible: true },
        orderBy: [{ placement: "asc" }, { position: "asc" }],
      },
      scheduleOverrides: {
        orderBy: { date: "asc" },
      },
      locations: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          hours: { orderBy: { dayOfWeek: "asc" } },
          scheduleOverrides: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  if (!business) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center p-5 bg-[#FFFAEB] dark:bg-[#111111]">
        <div className="w-full max-w-lg rounded-[1.25rem] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 p-10 text-center shadow-xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3AED]/10 mb-4">
            <span className="text-[#7C3AED] text-2xl font-bold">!</span>
          </div>
          <p className="text-xl font-bold text-black dark:text-white"><LocalizedText id="dxkajKZltYag" /></p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60"><LocalizedText id="rbdOSbCcy-U9" /></p>
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
  const cornerRadius = sp.radius ? parseInt(sp.radius, 10) : business.widgetCornerRadius;
  const shadowStyle = sp.shadow || business.widgetShadowStyle;
  const headerAlign = sp.headerAlign || business.widgetHeaderAlign;

  const baseUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
  const url = new URL(`/widget/${business.slug}`, baseUrl).toString();
  const region = getCountryConfig(business.countryCode);

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
        cornerRadius,
        shadowStyle,
        headerAlign,
        timezone: business.timezone,
        currencyCode: business.currencyCode,
        taxIdLabel: region.taxIdLabel,
        taxIdPlaceholder: region.taxIdPlaceholder,
      }}
      services={business.services
        .filter((service) => service.bookingMode !== "PRODUCTION" || business.productionOrdersEnabled)
        .map((s) => ({
        id: s.id, name: s.name, description: s.description, imageUrl: s.imageUrl, duration: s.duration, price: s.price, depositAmount: s.depositAmount,
        bookingMode: s.bookingMode,
        productionScheduleMode: s.productionScheduleMode,
        weeklyProductionCapacity: s.weeklyProductionCapacity,
        productionWeeksAhead: s.productionWeeksAhead,
        productionLeadTimeWeeks: s.productionLeadTimeWeeks,
        productionDepositPercent: s.productionDepositPercent,
        requiresReferenceImages: s.requiresReferenceImages,
        availabilityType: s.availabilityType,
        specialWeekDays: s.specialWeekDays,
        specialStartDate: s.specialStartDate?.toISOString().slice(0, 10) ?? null,
        specialEndDate: s.specialEndDate?.toISOString().slice(0, 10) ?? null,
        specialStartTime: s.specialStartTime,
        specialEndTime: s.specialEndTime,
        locationIds: s.locations.map((assignment) => assignment.locationId),
        category: s.category
          ? {
              id: s.category.id,
              name: s.category.name,
              position: s.category.position,
            }
          : null,
        optionCategories: s.optionCategories.map((category) => ({
          id: category.id,
          name: category.name,
          isRequired: category.isRequired,
          maxSelections: category.maxSelections,
          alternatives: category.alternatives.map((alternative) => ({
            id: alternative.id,
            name: alternative.name,
            priceDelta: alternative.priceDelta,
            durationDelta: alternative.durationDelta,
            isHomeService: alternative.isHomeService,
          })),
        })),
        recurringPlan: s.recurringPlan ? {
          mode: s.recurringPlan.mode as "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM",
          fixedDays: s.recurringPlan.fixedDays,
          daysPerWeek: s.recurringPlan.daysPerWeek,
          minRestDays: s.recurringPlan.minRestDays,
          durationOptions: s.recurringPlan.durationOptions,
          startDateRangeDays: s.recurringPlan.startDateRangeDays,
          requiresApproval: s.recurringPlan.requiresApproval,
          requiresHealthForm: s.recurringPlan.requiresHealthForm,
          healthQuestions: s.recurringPlan.healthQuestions,
          requiresRut: s.recurringPlan.requiresRut,
          renewalMessage: s.recurringPlan.renewalMessage,
          expirationWarningDays: s.recurringPlan.expirationWarningDays,
        } : null,
      }))}
      primaryColor={widgetColor}
      businessHours={business.businessHours.map((h) => ({
        dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isOpen: h.isOpen,
        breakStart: h.breakStart, breakEnd: h.breakEnd,
      }))}
      scheduleOverrides={business.scheduleOverrides.map((o) => ({
        date: o.date.toISOString().split("T")[0],
        isOpen: o.isOpen,
        startTime: o.startTime,
        endTime: o.endTime,
        breakStart: o.breakStart,
        breakEnd: o.breakEnd,
      }))}
      staffMembers={business.staff.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        serviceIds: s.services.map((sv) => sv.id),
        locationIds: s.locations.map((assignment) => assignment.locationId),
        locationSchedules: s.locations.map((assignment) => ({
          locationId: assignment.locationId,
          schedule: assignment.schedule.map((sc) => ({ dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking, breakStart: sc.breakStart, breakEnd: sc.breakEnd })),
        })),
        schedule: s.schedule.map((sc) => ({
          dayOfWeek: sc.dayOfWeek, startTime: sc.startTime, endTime: sc.endTime, isWorking: sc.isWorking,
          breakStart: sc.breakStart, breakEnd: sc.breakEnd,
        })),
        scheduleOverrides: s.scheduleOverrides.map((override) => ({
          date: override.date.toISOString().split("T")[0],
          isOpen: override.isWorking,
          startTime: override.startTime,
          endTime: override.endTime,
          breakStart: override.breakStart,
          breakEnd: override.breakEnd,
        })),
      }))}
      maxServicesPerBooking={business.maxServicesPerBooking}
      groupServicesByCategory={business.groupServicesByCategory}
      depositRequired={business.depositRequired && (business.depositPaymentMode === "MANUAL_LINK" || !!business.mpAccessToken)}
      allowSameDayBookings={business.allowSameDayBookings}
      slotInterval={business.slotInterval}
      minAdvanceBookingMinutes={business.minAdvanceBookingMinutes}
      promoBlocks={business.widgetPromoBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        subtitle: block.subtitle,
        imageUrl: block.imageUrl,
        linkUrl: block.linkUrl,
        placement: block.placement,
        position: block.position,
        textAlign: block.textAlign,
        discountType: block.discountType,
        discountValue: block.discountValue,
        discountStartsAt: block.discountStartsAt?.toISOString() ?? null,
        discountEndsAt: block.discountEndsAt?.toISOString() ?? null,
        discountMinSubtotal: block.discountMinSubtotal,
      }))}
      locations={business.locations.map((location) => ({
        id: location.id,
        name: location.name,
        slug: location.slug,
        address: location.address,
        mapsUrl: location.mapsUrl,
        timezone: location.timezone,
        hours: location.hours.map((hour) => ({ dayOfWeek: hour.dayOfWeek, startTime: hour.startTime, endTime: hour.endTime, isOpen: hour.isOpen, breakStart: hour.breakStart, breakEnd: hour.breakEnd })),
        scheduleOverrides: location.scheduleOverrides.map((override) => ({ date: override.date.toISOString().split("T")[0], isOpen: override.isOpen, startTime: override.startTime, endTime: override.endTime, breakStart: override.breakStart, breakEnd: override.breakEnd })),
      }))}
      initialLocationSlug={sp.location}
      initialServiceId={sp.service}
      initialStaffId={sp.staff}
      initialDate={sp.date}
      storyCampaignToken={sp.story}
      previewMode={previewMode}
    />
    </>
  );
}
