import { Gift } from "@/components/icons/hover-icons";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { GiftCardsDashboard } from "./gift-cards-dashboard";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function GiftCardsPage() {
  const t = await getTranslations("giftCardsPage");
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business) return <div className="py-20 text-center font-bold">{t("signIn")}</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return <div className="py-20 text-center font-bold">{t("noPermission")}</div>;

  const [templates, services, purchases, sold, sales, balances, serviceLiability, used] = await Promise.all([
    prisma.giftCardTemplate.findMany({ where: { businessId: business.id }, include: { services: { include: { service: { select: { id: true, name: true } } } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
    prisma.service.findMany({ where: { businessId: business.id, bookingMode: "APPOINTMENT" }, select: { id: true, name: true, price: true }, orderBy: { name: "asc" } }),
    prisma.giftCardPurchase.findMany({ where: { businessId: business.id }, include: { giftCard: { select: { id: true, publicCode: true, status: true, claimedAt: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.giftCardPurchase.count({ where: { businessId: business.id, paymentStatus: { in: ["PAID", "MANUAL_PAID"] } } }),
    prisma.giftCardPurchase.aggregate({ where: { businessId: business.id, paymentStatus: { in: ["PAID", "MANUAL_PAID"] } }, _sum: { salePrice: true } }),
    prisma.giftCard.aggregate({ where: { businessId: business.id, status: { in: ["ACTIVE", "DEPLETED"] }, type: "BALANCE" }, _sum: { remainingBalance: true } }),
    prisma.giftCardServiceEntitlement.findMany({ where: { giftCard: { businessId: business.id, status: { in: ["ACTIVE", "DEPLETED"] } } }, select: { unitValueSnapshot: true, quantityRemaining: true } }),
    prisma.giftCardTransaction.aggregate({ where: { giftCard: { businessId: business.id }, type: { in: ["REDEEMED", "RELEASED"] } }, _sum: { amount: true } }),
  ]);

  const pendingServiceValue = serviceLiability.reduce((sum, item) => sum + item.unitValueSnapshot * item.quantityRemaining, 0);
  return <div className="space-y-7 pb-14">
    <header><h1 className="flex items-center gap-3 text-3xl font-black"><Gift className="h-8 w-8" /> {t("title")}</h1><p className="mt-2 text-sm font-medium text-muted-foreground">{t("description")}</p></header>
    <GiftCardsDashboard
      business={{
        name: business.name,
        currencyCode: business.currencyCode,
        mercadoPagoConnected: Boolean(business.mpAccessToken),
        widgetSlug: business.slug,
        logoUrl: business.logoUrl,
        primaryColor: business.primaryColor,
        secondaryColor: business.secondaryColor,
      }}
      metrics={{ sold, sales: sales._sum.salePrice ?? 0, pending: (balances._sum.remainingBalance ?? 0) + pendingServiceValue, used: Math.abs(used._sum.amount ?? 0) }}
      templates={templates.map((template) => ({ ...template, createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() }))}
      services={services}
      purchases={purchases.map((purchase) => ({ ...purchase, templateSnapshot: null, createdAt: purchase.createdAt.toISOString(), updatedAt: purchase.updatedAt.toISOString(), paidAt: purchase.paidAt?.toISOString() ?? null }))}
    />
  </div>;
}
