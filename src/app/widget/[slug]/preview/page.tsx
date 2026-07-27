import { notFound } from "next/navigation";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { parseWidgetDesignDocument } from "@/core/widget-studio/schema";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { resolveWidgetAssets } from "@/server/services/widget-design.service";
import { WidgetClient } from "../widget-client";

export const dynamic = "force-dynamic";

export default async function WidgetDraftPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { slug } = await params;
  const { version: versionId } = await searchParams;
  const user = await getCurrentSessionUser();
  if (!user) notFound();
  const accessibleBusiness = await getBusinessForUser(user.id);
  if (!accessibleBusiness || accessibleBusiness.slug !== slug) notFound();
  if (!(await hasBusinessPermission(user, accessibleBusiness, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    notFound();
  }

  const business = await prisma.business.findUnique({
    where: { id: accessibleBusiness.id },
    include: {
      services: {
        orderBy: { name: "asc" },
        include: {
          category: true,
          recurringPlan: true,
          optionCategories: {
            orderBy: { position: "asc" },
            include: { alternatives: { orderBy: { position: "asc" } } },
          },
        },
      },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      staff: {
        where: { isActive: true },
        include: {
          schedule: { orderBy: { dayOfWeek: "asc" } },
          services: { select: { id: true } },
        },
      },
      widgetPromoBlocks: {
        where: { isVisible: true },
        orderBy: [{ placement: "asc" }, { position: "asc" }],
      },
      widgetDesign: true,
    },
  });
  if (!business?.widgetDesign) notFound();

  const version = versionId
    ? await prisma.widgetDesignVersion.findFirst({
        where: {
          id: versionId,
          designId: business.widgetDesign.id,
        },
        select: { document: true },
      })
    : null;
  if (versionId && !version) notFound();
  const document = parseWidgetDesignDocument(
    version?.document || business.widgetDesign.draftDocument,
  );
  const assets = await resolveWidgetAssets(business.id, document);
  const primaryColor = document.tokens.colors.primary.replace("#", "");

  return (
    <WidgetClient
      business={{
        name: business.name,
        slug: business.slug,
        apiKey: business.apiKey,
        logoUrl: business.logoUrl,
        primaryColor: document.tokens.colors.primary,
        secondaryColor: document.tokens.colors.secondary,
        backgroundColor: document.tokens.colors.background,
        brandColor: primaryColor,
        textColor: document.tokens.colors.text,
        textSecondary: document.tokens.colors.textMuted,
        fontSize: document.tokens.typography.baseSize,
        cornerRadius: document.tokens.shape.radius,
        shadowStyle: document.tokens.shape.shadow,
        headerAlign: document.shell.headerAlign,
      }}
      services={business.services
        .filter((service) => service.bookingMode !== "PRODUCTION" || business.productionOrdersEnabled)
        .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        imageUrl: service.imageUrl,
        duration: service.duration,
        price: service.price,
        depositAmount: service.depositAmount,
        bookingMode: service.bookingMode,
        productionScheduleMode: service.productionScheduleMode,
        weeklyProductionCapacity: service.weeklyProductionCapacity,
        productionWeeksAhead: service.productionWeeksAhead,
        productionLeadTimeWeeks: service.productionLeadTimeWeeks,
        productionDepositPercent: service.productionDepositPercent,
        requiresReferenceImages: service.requiresReferenceImages,
        category: service.category
          ? {
              id: service.category.id,
              name: service.category.name,
              position: service.category.position,
            }
          : null,
        optionCategories: service.optionCategories.map((category) => ({
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
        recurringPlan: service.recurringPlan ? {
          mode: service.recurringPlan.mode as "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM",
          fixedDays: service.recurringPlan.fixedDays,
          daysPerWeek: service.recurringPlan.daysPerWeek,
          minRestDays: service.recurringPlan.minRestDays,
          durationOptions: service.recurringPlan.durationOptions,
          startDateRangeDays: service.recurringPlan.startDateRangeDays,
          requiresApproval: service.recurringPlan.requiresApproval,
          requiresHealthForm: service.recurringPlan.requiresHealthForm,
          healthQuestions: service.recurringPlan.healthQuestions,
          requiresRut: service.recurringPlan.requiresRut,
          renewalMessage: service.recurringPlan.renewalMessage,
          expirationWarningDays: service.recurringPlan.expirationWarningDays,
        } : null,
      }))}
      primaryColor={primaryColor}
      businessHours={business.businessHours.map((hours) => ({
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
        isOpen: hours.isOpen,
        breakStart: hours.breakStart,
        breakEnd: hours.breakEnd,
      }))}
      staffMembers={business.staff.map((staff) => ({
        id: staff.id,
        name: staff.name,
        imageUrl: staff.imageUrl,
        serviceIds: staff.services.map((service) => service.id),
        schedule: staff.schedule.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isWorking: schedule.isWorking,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
        })),
      }))}
      maxServicesPerBooking={business.maxServicesPerBooking}
      groupServicesByCategory={business.groupServicesByCategory}
      depositRequired={false}
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
      designDocument={document}
      designAssets={assets}
      previewMode
    />
  );
}
