import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getClientPortalAccount } from "@/server/services/client-portal.service";
import { hashGiftCardClaimToken } from "@/server/services/gift-card.service";
import { ClaimGiftCard } from "../claim-gift-card";
import { getTranslations } from "next-intl/server";

export default async function ClaimGiftCardTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const t = await getTranslations("giftCardsPortal");
  const { token } = await params;
  const returnTo = `/mi-agenda/gift-cards/reclamar/${encodeURIComponent(token)}`;
  const account = await getClientPortalAccount();
  if (!account) redirect(`/mi-agenda?returnTo=${encodeURIComponent(returnTo)}`);
  const card = await prisma.giftCard.findUnique({
    where: { claimTokenHash: hashGiftCardClaimToken(token) },
    include: { business: { select: { name: true } }, entitlements: true },
  });
  const value = card?.type === "BALANCE"
    ? formatPrice(card.faceValueSnapshot || 0, card.currencyCode)
    : card?.entitlements.map((item) => `${item.serviceNameSnapshot} × ${item.quantityInitial}`).join(" · ") || t("servicesIncluded");
  return <ClaimGiftCard token={token} preview={card ? { businessName: card.business.name, name: card.nameSnapshot, value } : undefined} />;
}
