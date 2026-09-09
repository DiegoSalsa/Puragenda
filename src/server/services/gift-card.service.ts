import crypto from "node:crypto";
import { Prisma, type GiftCardDeliveryMode, type GiftCardType } from "@prisma/client";
import { GiftCardTemplateSnapshot, quoteBalanceGiftCard, quoteServiceGiftCard } from "@/core/gift-cards";
import { prisma } from "@/server/db/prisma";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function giftCardSecret() {
  const secret = process.env.GIFT_CARD_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("GIFT_CARD_SECRET or AUTH_SECRET must be configured in production");
  return "dev-only-gift-card-secret-change-before-production";
}

export function hashGiftCardClaimToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function deriveGiftCardClaimToken(giftCardId: string, purchaseId: string) {
  return crypto.createHmac("sha256", giftCardSecret()).update(`gift-card:${giftCardId}:${purchaseId}`).digest("base64url");
}

function generatePublicCode() {
  const bytes = crypto.randomBytes(12);
  let value = "GC-";
  for (let index = 0; index < 12; index += 1) value += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  return `${value.slice(0, 7)}-${value.slice(7)}`;
}

export function normalizeGiftCardCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function snapshotGiftCardTemplate(template: {
  name: string; description: string | null; type: GiftCardType; salePrice: number; faceValue: number | null;
  currencyCode: string; designPreset: string; backgroundColor: string; accentColor: string; textColor: string;
  imageUrl: string | null; shortMessage: string | null;
  services: Array<{ quantity: number; service: { id: string; name: string; price: number } }>;
}): GiftCardTemplateSnapshot {
  return {
    name: template.name,
    description: template.description,
    type: template.type,
    salePrice: template.salePrice,
    faceValue: template.faceValue,
    currencyCode: template.currencyCode,
    designPreset: template.designPreset,
    backgroundColor: template.backgroundColor,
    accentColor: template.accentColor,
    textColor: template.textColor,
    imageUrl: template.imageUrl,
    shortMessage: template.shortMessage,
    services: template.services.map((item) => ({ serviceId: item.service.id, serviceName: item.service.name, servicePrice: Math.round(item.service.price), quantity: item.quantity })),
  };
}

export function parseGiftCardSnapshot(value: Prisma.JsonValue): GiftCardTemplateSnapshot {
  const snapshot = value as unknown as GiftCardTemplateSnapshot;
  if (!snapshot || !["BALANCE", "SERVICE"].includes(snapshot.type) || !Array.isArray(snapshot.services)) {
    throw new Error("La compra no contiene un snapshot de Gift Card válido");
  }
  return snapshot;
}

export async function createGiftCardPurchase(input: {
  businessId: string;
  templateId: string;
  paymentMethod: "MERCADOPAGO" | "MANUAL";
  paymentStatus?: "PENDING" | "MANUAL_PAID";
  buyerName: string;
  buyerEmail: string;
  deliveryMode: GiftCardDeliveryMode;
  recipientName?: string | null;
  recipientEmail?: string | null;
  senderName?: string | null;
  giftMessage?: string | null;
  manualPaymentMethod?: string | null;
  createdById?: string | null;
}) {
  const template = await prisma.giftCardTemplate.findFirst({
    where: { id: input.templateId, businessId: input.businessId, isActive: true },
    include: { services: { include: { service: { select: { id: true, name: true, price: true, businessId: true } } } } },
  });
  if (!template) throw new Error("Gift Card no disponible");
  if (template.type === "SERVICE" && template.services.length === 0) throw new Error("La Gift Card no tiene servicios configurados");
  if (template.services.some((item) => item.service.businessId !== input.businessId)) throw new Error("Servicio de otro negocio");
  const snapshot = snapshotGiftCardTemplate(template);
  return prisma.giftCardPurchase.create({
    data: {
      businessId: input.businessId,
      templateId: template.id,
      type: template.type,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus ?? "PENDING",
      salePrice: template.salePrice,
      currencyCode: template.currencyCode,
      templateNameSnapshot: template.name,
      templateSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim().toLowerCase(),
      deliveryMode: input.deliveryMode,
      recipientName: input.deliveryMode === "GIFT" ? input.recipientName?.trim() : null,
      recipientEmail: input.deliveryMode === "GIFT" ? input.recipientEmail?.trim().toLowerCase() : null,
      senderName: input.deliveryMode === "GIFT" ? input.senderName?.trim() : null,
      giftMessage: input.deliveryMode === "GIFT" ? input.giftMessage?.trim() || null : null,
      manualPaymentMethod: input.manualPaymentMethod,
      createdById: input.createdById,
      paidAt: input.paymentStatus === "MANUAL_PAID" ? new Date() : null,
    },
  });
}

export async function issueGiftCardForPurchase(purchaseId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const existing = await client.giftCard.findUnique({ where: { purchaseId } });
  if (existing) return { giftCard: existing, claimToken: deriveGiftCardClaimToken(existing.id, purchaseId), created: false };

  const purchase = await client.giftCardPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || !["PAID", "MANUAL_PAID"].includes(purchase.paymentStatus)) throw new Error("La compra todavía no está pagada");
  const snapshot = parseGiftCardSnapshot(purchase.templateSnapshot);
  const giftCardId = crypto.randomUUID();
  const claimToken = deriveGiftCardClaimToken(giftCardId, purchase.id);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const giftCard = await client.giftCard.create({
        data: {
          id: giftCardId,
          businessId: purchase.businessId,
          purchaseId: purchase.id,
          templateId: purchase.templateId,
          publicCode: generatePublicCode(),
          claimTokenHash: hashGiftCardClaimToken(claimToken),
          type: snapshot.type,
          nameSnapshot: snapshot.name,
          descriptionSnapshot: snapshot.description,
          currencyCode: snapshot.currencyCode,
          salePriceSnapshot: snapshot.salePrice,
          faceValueSnapshot: snapshot.faceValue,
          designPresetSnapshot: snapshot.designPreset,
          backgroundColorSnapshot: snapshot.backgroundColor,
          accentColorSnapshot: snapshot.accentColor,
          textColorSnapshot: snapshot.textColor,
          imageUrlSnapshot: snapshot.imageUrl,
          shortMessageSnapshot: snapshot.shortMessage,
          initialBalance: snapshot.type === "BALANCE" ? snapshot.faceValue : null,
          remainingBalance: snapshot.type === "BALANCE" ? snapshot.faceValue : null,
          entitlements: snapshot.type === "SERVICE" ? {
            create: snapshot.services.map((item) => ({
              serviceId: item.serviceId,
              serviceNameSnapshot: item.serviceName,
              unitValueSnapshot: item.servicePrice,
              quantityInitial: item.quantity,
              quantityRemaining: item.quantity,
            })),
          } : undefined,
          transactions: snapshot.type === "BALANCE" && snapshot.faceValue ? {
            create: { amount: snapshot.faceValue, type: "ISSUED", reason: "Emisión de Gift Card" },
          } : undefined,
        },
      });
      return { giftCard, claimToken, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const duplicate = await client.giftCard.findUnique({ where: { purchaseId } });
      if (duplicate) return { giftCard: duplicate, claimToken: deriveGiftCardClaimToken(duplicate.id, purchaseId), created: false };
    }
  }
  throw new Error("No se pudo emitir un código único de Gift Card");
}

export async function issueManualGiftCard(input: Parameters<typeof createGiftCardPurchase>[0]) {
  return prisma.$transaction(async (tx) => {
    const purchase = await createGiftCardPurchaseWithClient(tx, { ...input, paymentMethod: "MANUAL", paymentStatus: "MANUAL_PAID" });
    return issueGiftCardForPurchase(purchase.id, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function createGiftCardPurchaseWithClient(tx: Prisma.TransactionClient, input: Parameters<typeof createGiftCardPurchase>[0]) {
  const template = await tx.giftCardTemplate.findFirst({
    where: { id: input.templateId, businessId: input.businessId, isActive: true },
    include: { services: { include: { service: { select: { id: true, name: true, price: true, businessId: true } } } } },
  });
  if (!template) throw new Error("Gift Card no disponible");
  if (template.type === "SERVICE" && template.services.length === 0) throw new Error("La Gift Card no tiene servicios configurados");
  if (template.services.some((item) => item.service.businessId !== input.businessId)) throw new Error("Servicio de otro negocio");
  const snapshot = snapshotGiftCardTemplate(template);
  return tx.giftCardPurchase.create({ data: {
    businessId: input.businessId, templateId: template.id, type: template.type,
    paymentMethod: input.paymentMethod, paymentStatus: input.paymentStatus ?? "PENDING",
    salePrice: template.salePrice, currencyCode: template.currencyCode, templateNameSnapshot: template.name,
    templateSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    buyerName: input.buyerName.trim(), buyerEmail: input.buyerEmail.trim().toLowerCase(), deliveryMode: input.deliveryMode,
    recipientName: input.deliveryMode === "GIFT" ? input.recipientName?.trim() : null,
    recipientEmail: input.deliveryMode === "GIFT" ? input.recipientEmail?.trim().toLowerCase() : null,
    senderName: input.deliveryMode === "GIFT" ? input.senderName?.trim() : null,
    giftMessage: input.deliveryMode === "GIFT" ? input.giftMessage?.trim() || null : null,
    manualPaymentMethod: input.manualPaymentMethod, createdById: input.createdById,
    paidAt: input.paymentStatus === "MANUAL_PAID" ? new Date() : null,
  } });
}

export async function claimGiftCard(input: { accountId: string; token?: string; code?: string }) {
  return prisma.$transaction(async (tx) => {
    const selector = input.token
      ? { claimTokenHash: hashGiftCardClaimToken(input.token) }
      : { publicCode: normalizeGiftCardCode(input.code ?? "") };
    const giftCard = await tx.giftCard.findUnique({ where: selector, select: { id: true, status: true, claimedAt: true, claimedByAccountId: true } });
    if (!giftCard || giftCard.status !== "ACTIVE") throw new Error("Gift Card inválida o no disponible");
    if (giftCard.claimedAt || giftCard.claimedByAccountId) throw new Error("Esta Gift Card ya fue agregada a una cuenta");
    const claimed = await tx.giftCard.updateMany({
      where: { id: giftCard.id, status: "ACTIVE", claimedAt: null, claimedByAccountId: null },
      data: { claimedByAccountId: input.accountId, claimedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("Esta Gift Card acaba de ser reclamada");
    return tx.giftCard.findUniqueOrThrow({ where: { id: giftCard.id }, include: { business: { select: { name: true, slug: true } }, entitlements: true } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function quoteOwnedGiftCard(input: {
  giftCardId: string; accountId: string; businessId: string; totalDue: number;
  services: Array<{ id: string; basePrice: number }>;
  hasDiscount: boolean;
}) {
  const card = await prisma.giftCard.findFirst({
    where: { id: input.giftCardId, businessId: input.businessId, claimedByAccountId: input.accountId, status: "ACTIVE" },
    include: { entitlements: true },
  });
  if (!card) throw new Error("Gift Card no disponible para esta reserva");
  if (card.type === "BALANCE") {
    const amountCovered = quoteBalanceGiftCard(card.remainingBalance ?? 0, input.totalDue);
    if (amountCovered <= 0) throw new Error("Esta Gift Card no tiene saldo disponible");
    return { card, amountCovered, coveredServices: [] };
  }
  if (input.hasDiscount) throw new Error("Las Gift Cards de servicios no se pueden combinar con promociones o premios en esta versión");
  const quote = quoteServiceGiftCard({ services: input.services, entitlements: card.entitlements, totalDue: input.totalDue });
  if (quote.amountCovered <= 0) throw new Error("Esta Gift Card no incluye los servicios seleccionados");
  return { card, ...quote };
}

export async function reserveGiftCardRedemption(tx: Prisma.TransactionClient, input: {
  giftCardId: string; accountId: string; businessId: string; appointmentId: string; amountCovered: number;
  coveredServices: Array<{ serviceId: string; amountCovered: number }>;
  commitImmediately: boolean;
}) {
  const card = await tx.giftCard.findFirst({
    where: { id: input.giftCardId, businessId: input.businessId, claimedByAccountId: input.accountId, status: "ACTIVE" },
    include: { entitlements: true },
  });
  if (!card) throw new Error("Gift Card no disponible");
  if (input.amountCovered <= 0) throw new Error("El monto a cubrir debe ser mayor a cero");

  if (card.type === "BALANCE") {
    const updated = await tx.giftCard.updateMany({
      where: { id: card.id, status: "ACTIVE", remainingBalance: { gte: input.amountCovered } },
      data: { remainingBalance: { decrement: input.amountCovered } },
    });
    if (updated.count !== 1) throw new Error("Saldo insuficiente o Gift Card utilizada en otra reserva");
  } else {
    for (const covered of input.coveredServices) {
      const entitlement = card.entitlements.find((item) => item.serviceId === covered.serviceId);
      if (!entitlement) throw new Error("Beneficio no disponible");
      const updated = await tx.giftCardServiceEntitlement.updateMany({
        where: { id: entitlement.id, giftCardId: card.id, quantityRemaining: { gte: 1 } },
        data: { quantityRemaining: { decrement: 1 } },
      });
      if (updated.count !== 1) throw new Error("Beneficio utilizado en otra reserva");
    }
  }

  const redemption = await tx.giftCardRedemption.create({ data: {
    giftCardId: card.id,
    appointmentId: input.appointmentId,
    amountCovered: input.amountCovered,
    status: input.commitImmediately ? "COMMITTED" : "RESERVED",
    committedAt: input.commitImmediately ? new Date() : null,
    items: card.type === "SERVICE" ? { create: input.coveredServices.map((covered) => {
      const entitlement = card.entitlements.find((item) => item.serviceId === covered.serviceId)!;
      return { entitlementId: entitlement.id, quantity: 1, amountCovered: covered.amountCovered, serviceNameSnapshot: entitlement.serviceNameSnapshot };
    }) } : undefined,
  } });

  if (card.type === "BALANCE") await tx.giftCardTransaction.create({ data: {
    giftCardId: card.id, amount: -input.amountCovered, type: "REDEEMED", appointmentId: input.appointmentId,
    redemptionId: redemption.id, reason: input.commitImmediately ? "Canje confirmado" : "Saldo reservado para pago pendiente",
  } });

  const depleted = card.type === "BALANCE"
    ? (card.remainingBalance ?? 0) - input.amountCovered === 0
    : card.entitlements.every((item) => item.quantityRemaining - (input.coveredServices.some((covered) => covered.serviceId === item.serviceId) ? 1 : 0) <= 0);
  if (depleted) await tx.giftCard.update({ where: { id: card.id }, data: { status: "DEPLETED" } });
  return redemption;
}

export async function commitGiftCardRedemptions(appointmentIds: string[], txClient?: Prisma.TransactionClient) {
  const run = async (tx: Prisma.TransactionClient) => tx.giftCardRedemption.updateMany({
    where: { appointmentId: { in: appointmentIds }, status: "RESERVED" },
    data: { status: "COMMITTED", committedAt: new Date() },
  });
  return txClient ? run(txClient) : prisma.$transaction(run);
}

export async function releaseGiftCardRedemptions(input: { appointmentIds: string[]; reason: string; createdById?: string }, txClient?: Prisma.TransactionClient) {
  const run = async (tx: Prisma.TransactionClient) => {
    const redemptions = await tx.giftCardRedemption.findMany({
      where: { appointmentId: { in: input.appointmentIds }, status: { in: ["RESERVED", "COMMITTED"] } },
      include: { giftCard: true, items: true },
    });
    for (const redemption of redemptions) {
      const won = await tx.giftCardRedemption.updateMany({
        where: { id: redemption.id, status: redemption.status },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      if (won.count !== 1) continue;
      if (redemption.giftCard.type === "BALANCE") {
        await tx.giftCard.update({ where: { id: redemption.giftCardId }, data: { remainingBalance: { increment: redemption.amountCovered }, status: "ACTIVE" } });
        await tx.giftCardTransaction.create({ data: {
          giftCardId: redemption.giftCardId, amount: redemption.amountCovered, type: "RELEASED",
          appointmentId: redemption.appointmentId, redemptionId: redemption.id, reason: input.reason, createdById: input.createdById,
        } });
      } else {
        for (const item of redemption.items) await tx.giftCardServiceEntitlement.update({
          where: { id: item.entitlementId }, data: { quantityRemaining: { increment: item.quantity } },
        });
        await tx.giftCard.update({ where: { id: redemption.giftCardId }, data: { status: "ACTIVE" } });
      }
    }
    return redemptions.length;
  };
  return txClient ? run(txClient) : prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
