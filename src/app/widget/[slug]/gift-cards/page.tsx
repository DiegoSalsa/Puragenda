import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { GiftCardStorefront } from "./gift-card-storefront";

export const dynamic = "force-dynamic";

export default async function GiftCardsStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug }, select: { name: true, slug: true, logoUrl: true, currencyCode: true, mpAccessToken: true, giftCardTemplates: { where: { isActive: true, isPublic: true }, include: { services: { include: { service: { select: { name: true } } } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] } } });
  if (!business) notFound();
  return <GiftCardStorefront slug={business.slug} business={{ name: business.name, currencyCode: business.currencyCode, logoUrl: business.logoUrl }} templates={business.giftCardTemplates} paymentEnabled={Boolean(business.mpAccessToken)} />;
}
