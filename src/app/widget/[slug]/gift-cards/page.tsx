import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { GiftCardStorefront } from "./gift-card-storefront";

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
      giftCardTemplates: {
        where: { isActive: true, isPublic: true },
        include: { services: { include: { service: { select: { name: true } } } } },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!business) notFound();
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
