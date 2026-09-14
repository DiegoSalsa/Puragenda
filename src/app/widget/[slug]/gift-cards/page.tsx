import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { GiftCardStorefront } from "./gift-card-storefront";
import { shouldShowWidgetSubscriptionUnavailable } from "@/lib/widget/subscription-gate";

export const dynamic = "force-dynamic";

export default async function GiftCardsStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      currencyCode: true,
      primaryColor: true,
      brandColor: true,
      secondaryColor: true,
      backgroundColor: true,
      textColor: true,
      textMutedColor: true,
      widgetFontSize: true,
      widgetCornerRadius: true,
      widgetShadowStyle: true,
      widgetHeaderAlign: true,
      mpAccessToken: true,
      subscription: {
        select: { status: true, isTrial: true, trialEndsAt: true, gracePeriodEndsAt: true },
      },
      giftCardTemplates: {
        where: { isActive: true, isPublic: true },
        include: { services: { include: { service: { select: { name: true } } } } },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!business) notFound();
  if (shouldShowWidgetSubscriptionUnavailable(business.subscription, false)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FFFAEB] p-5 dark:bg-[#111111]">
        <div className="w-full max-w-lg rounded-[1.25rem] border border-black/10 bg-white/50 p-10 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3AED]/10">
            <span className="text-2xl font-bold text-[#7C3AED]">!</span>
          </div>
          <p className="text-xl font-bold text-black dark:text-white">
            Las reservas online de este negocio no están disponibles temporalmente
          </p>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Contacta directamente al negocio para más información.
          </p>
        </div>
      </div>
    );
  }
  const primarySource = business.brandColor || business.primaryColor || "7C3AED";
  const primaryColor = primarySource.startsWith("#") ? primarySource : `#${primarySource}`;
  return (
    <GiftCardStorefront
      slug={business.slug}
      business={{
        name: business.name,
        currencyCode: business.currencyCode,
        logoUrl: business.logoUrl,
        primaryColor,
        secondaryColor: business.secondaryColor,
        backgroundColor: business.backgroundColor,
        textColor: business.textColor || "#FFFFFF",
        textSecondary: business.textMutedColor || `${business.textColor || "#FFFFFF"}66`,
        fontSize: business.widgetFontSize || 14,
        cornerRadius: business.widgetCornerRadius,
        shadowStyle: business.widgetShadowStyle,
        headerAlign: business.widgetHeaderAlign,
      }}
      templates={business.giftCardTemplates}
      paymentEnabled={Boolean(business.mpAccessToken)}
    />
  );
}
