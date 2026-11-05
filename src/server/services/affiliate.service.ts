import { prisma } from "@/server/db/prisma";
import { applyDiscount } from "@/server/services/discount.service";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { isV2Plan } from "./commercial-plan-access";
import { hasPendingCommercialBenefit } from "./commercial-benefit-hold";

// ═══════════════════════════════════════════
// ROULETTE PRIZES — Probability Table
// ═══════════════════════════════════════════

export const ROULETTE_PRIZES = [
  { id: "nada",             name: "Más Suerte la Próxima", type: "NONE"       as const, percentage: null, freeMonths: null, probability: 0.10,   displayProb: "10%", color: "#4B5563" }, // Gray
  { id: "una_ficha",        name: "1 Ficha Gratis",        type: "FREE_SPIN"  as const, percentage: null, freeMonths: null, probability: 0.10,   displayProb: "15%", color: "#3B82F6" }, // Blue
  { id: "fix_rapido",       name: "Descuento Bronce",         type: "PERCENTAGE" as const, percentage: 10,   freeMonths: null, probability: 0.25,   displayProb: "25%", color: "#10B981" }, // Emerald
  { id: "boost_diseno",     name: "Descuento Plata",       type: "PERCENTAGE" as const, percentage: 15,   freeMonths: null, probability: 0.20,   displayProb: "20%", color: "#0EA5E9" }, // Sky
  { id: "impacto_visual",   name: "Descuento Oro",        type: "PERCENTAGE" as const, percentage: 20,   freeMonths: null, probability: 0.15,   displayProb: "13%", color: "#8B5CF6" }, // Violet
  { id: "neo_brutalismo",   name: "Descuento Platino",        type: "PERCENTAGE" as const, percentage: 30,   freeMonths: null, probability: 0.10,   displayProb: "10%", color: "#D946EF" }, // Fuchsia
  { id: "modo_dios",        name: "Descuento Diamante",             type: "PERCENTAGE" as const, percentage: 50,   freeMonths: null, probability: 0.05,   displayProb: "4%",  color: "#F43F5E" }, // Rose
  { id: "jackpot",          name: "Mes de Regalo",    type: "FREE_MONTH" as const, percentage: null, freeMonths: 1,    probability: 0.0489, displayProb: "2%",  color: "#F59E0B" }, // Amber
  { id: "santo_grial",      name: "Trimestre Invencible",        type: "FREE_MONTH" as const, percentage: null, freeMonths: 3,    probability: 0.0011, displayProb: "1%",  color: "#EF4444" }, // Red
] as const;

export type RoulettePrize = (typeof ROULETTE_PRIZES)[number];

// ═══════════════════════════════════════════
// REFERRAL CODE GENERATION
// ═══════════════════════════════════════════

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "PG-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

// ═══════════════════════════════════════════
// AFFILIATE CRUD
// ═══════════════════════════════════════════

/**
 * Get or create an affiliate record for a business.
 */
export async function getOrCreateAffiliate(businessId: string) {
  const existing = await prisma.affiliate.findUnique({ where: { businessId } });
  if (existing) return existing;

  // Generate unique code (retry if collision)
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const clash = await prisma.affiliate.findUnique({ where: { referralCode: code } });
    if (!clash) break;
    code = generateReferralCode();
    attempts++;
  }

  return prisma.affiliate.create({
    data: { businessId, referralCode: code },
  });
}

/**
 * Find an affiliate by referral code.
 */
export async function findAffiliateByCode(referralCode: string) {
  return prisma.affiliate.findUnique({
    where: { referralCode: referralCode.toUpperCase().trim() },
    include: { business: { select: { id: true, name: true, slug: true } } },
  });
}

/**
 * Apply referral code to a newly created business.
 */
export async function applyReferralCode(newBusinessId: string, referralCode: string) {
  const affiliate = await findAffiliateByCode(referralCode);
  if (!affiliate) return { success: false as const, error: "Código de referido no válido" };

  // Don't allow self-referral
  if (affiliate.businessId === newBusinessId) {
    return { success: false as const, error: "No puedes usar tu propio código de referido" };
  }

  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${newBusinessId} FOR UPDATE`;
    const business=await tx.business.findUnique({where:{id:newBusinessId},include:{subscription:true}});
    const referrer=await tx.business.findUnique({where:{id:affiliate.businessId},select:{ownerId:true}});
    if(!business || business.ownerId===referrer?.ownerId) return {success:false as const,error:"No puedes usar tu propio código de referido"};
    if(business.referredByAffiliateId===affiliate.id) return {success:true as const,affiliateBusinessName:affiliate.business.name};
    if(business.referredByAffiliateId || business.subscription?.hasCountedAsPaidReferral
      || await tx.commercialPaymentEvidence.findFirst({where:{businessId:newBusinessId,status:"CONFIRMED"}})) return {success:false as const,error:"El referido solo puede registrarse una vez, antes del primer pago"};
    if(await tx.commercialBillingOperation.findFirst({where:{businessId:newBusinessId,status:{in:["PREPARED","EXECUTING","UNKNOWN","AWAITING_PAYMENT","SCHEDULED","PAID"]}}})) return {success:false as const,error:"La contratación ya está en curso"};
    if(business.subscription?.pendingDiscountPercentage!=null || business.subscription?.activePrizeId) return {success:false as const,error:"Ya tienes un beneficio pendiente"};
    await tx.business.update({where:{id:newBusinessId},data:{referredByAffiliateId:affiliate.id}});
    await tx.subscription.updateMany({where:{businessId:newBusinessId},data:{pendingDiscountPercentage:25}});
    return {success:true as const,affiliateBusinessName:affiliate.business.name};
  });
}

/**
 * Increment paid referrals for an affiliate.
 * Called when a referred business becomes a paying customer.
 */
export async function incrementPaidReferrals(businessId: string, transaction?: Prisma.TransactionClient) {
  const apply=async(tx:Prisma.TransactionClient)=>{
  await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${businessId} FOR UPDATE`;
  const business = await tx.business.findUnique({
    where: { id: businessId },
    select: { referredByAffiliateId: true, subscription:true, commercialSubscription:true },
  });

  if (!business?.referredByAffiliateId) return;
  const sub=business.subscription;
  const evidence=isV2Plan(sub?.plan) && business.commercialSubscription?.lastPaymentEventId
    ? await tx.commercialPaymentEvidence.findFirst({where:{businessId,eventId:business.commercialSubscription.lastPaymentEventId,status:"CONFIRMED"}}) : null;
  const legacyProof=!isV2Plan(sub?.plan) && sub?.lastPaymentStatus==="approved" && sub.lastPaymentId && sub.lastInvoiceId;
  if(!evidence && !legacyProof) return;

  const claimed=await tx.subscription.updateMany({where:{businessId,hasCountedAsPaidReferral:false},data:{hasCountedAsPaidReferral:true}});
  if(!claimed.count) return;
  const affiliate = await tx.affiliate.update({
    where: { id: business.referredByAffiliateId },
    data: { paidReferrals: { increment: 1 } },
  });

  await tx.commercialEvent.upsert({where:{source_eventId:{source:"paid_referral",eventId:businessId}},update:{},create:{businessId,source:"paid_referral",eventId:businessId,operation:"FIRST_CONFIRMED_PAYMENT_REFERRAL",outcome:"APPLIED",occurredAt:new Date(),providerReference:evidence?.paymentId ?? sub!.lastPaymentId,details:{affiliateId:affiliate.id,paymentEvidenceId:evidence?.id ?? null,invoiceId:evidence?null:sub!.lastInvoiceId}}});
  };
  return transaction ? apply(transaction) : prisma.$transaction(apply);
}

/**
 * Get affiliate info for a business (dashboard display).
 */
export async function getAffiliateInfo(businessId: string) {
  return prisma.affiliate.findUnique({
    where: { businessId },
    include: {
      referredBusinesses: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          subscription: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ═══════════════════════════════════════════
// TOKEN BALANCE
// ═══════════════════════════════════════════

export function getTokenBalance(affiliate: { paidReferrals: number; spentTokens: number }) {
  return affiliate.paidReferrals - affiliate.spentTokens;
}

// ═══════════════════════════════════════════
// ROULETTE — Spin Logic
// ═══════════════════════════════════════════

/**
 * Weighted random selection from the prize table.
 */
function rollRoulette(): RoulettePrize {
  const roll = Math.random();
  let cumulative = 0;

  for (const prize of ROULETTE_PRIZES) {
    cumulative += prize.probability;
    if (roll <= cumulative) {
      return prize;
    }
  }

  // Fallback (should never happen, but safety net)
  return ROULETTE_PRIZES[0];
}

/**
 * Spin the roulette: costs 1 token, creates a Prize record in AVAILABLE status.
 * The prize is NOT auto-applied — user chooses when to activate it.
 */
export async function spinRoulette(businessId: string) {
  const affiliate = await prisma.affiliate.findUnique({ where: { businessId } });
  if (!affiliate) return { success: false as const, error: "Afiliado no encontrado" };

  const balance = getTokenBalance(affiliate);
  if (balance < 1) {
    return { success: false as const, error: "No tienes fichas disponibles" };
  }

  // Roll the dice
  const wonPrize = rollRoulette();
  const prizeIndex = ROULETTE_PRIZES.findIndex((p) => p.id === wonPrize.id);

  // For NONE and FREE_SPIN types, no prize record is created.
  if (wonPrize.type === "NONE" || wonPrize.type === "FREE_SPIN") {
    if (wonPrize.type === "NONE") {
      // Consume token
      await prisma.affiliate.update({
        where: { id: affiliate.id, spentTokens: affiliate.spentTokens },
        data: { spentTokens: { increment: 1 } },
      });
    }
    // If FREE_SPIN, token is not consumed (spentTokens unchanged).

    return {
      success: true as const,
      prize: {
        id: null,
        name: wonPrize.name,
        type: wonPrize.type,
        percentage: null,
        freeMonths: null,
        color: wonPrize.color,
        index: prizeIndex,
      },
    };
  }

  // Atomic transaction: spend 1 token + create prize
  const [, prize] = await prisma.$transaction([
    prisma.affiliate.update({
      where: { id: affiliate.id, spentTokens: affiliate.spentTokens },
      data: { spentTokens: { increment: 1 } },
    }),
    prisma.prize.create({
      data: {
        affiliateId: affiliate.id,
        type: wonPrize.type,
        percentage: wonPrize.percentage,
        freeMonths: wonPrize.freeMonths,
        name: wonPrize.name,
        status: "AVAILABLE",
      },
    }),
  ]);

  return {
    success: true as const,
    prize: {
      id: prize.id,
      name: wonPrize.name,
      type: wonPrize.type,
      percentage: wonPrize.percentage,
      freeMonths: wonPrize.freeMonths,
      color: wonPrize.color,
      index: prizeIndex,
    },
  };
}

// ═══════════════════════════════════════════
// FIXED DISCOUNT — 3 tokens → 50% OFF
// ═══════════════════════════════════════════

/**
 * Redeem 3 tokens for a guaranteed 50% OFF prize (AVAILABLE, not auto-applied).
 */
export async function redeemFixedDiscount(businessId: string) {
  const affiliate = await prisma.affiliate.findUnique({ where: { businessId } });
  if (!affiliate) return { success: false as const, error: "Afiliado no encontrado" };

  const balance = getTokenBalance(affiliate);
  if (balance < 3) {
    return { success: false as const, error: "Necesitas al menos 3 fichas" };
  }

  const [, prize] = await prisma.$transaction([
    prisma.affiliate.update({
      where: { id: affiliate.id, spentTokens: affiliate.spentTokens },
      data: { spentTokens: { increment: 3 } },
    }),
    prisma.prize.create({
      data: {
        affiliateId: affiliate.id,
        type: "PERCENTAGE",
        percentage: 50,
        freeMonths: null,
        name: "Canje 3 Fichas — 50% OFF",
        status: "AVAILABLE",
      },
    }),
  ]);

  return { success: true as const, prize };
}

// ═══════════════════════════════════════════
// PRIZE ACTIVATION — User picks which to use
// ═══════════════════════════════════════════

/**
 * Activate a specific prize — applies the discount to MercadoPago.
 * Only one prize can be active at a time.
 */
export async function activatePrize(businessId: string, prizeId: string) {
  const projection=await prisma.subscription.findUnique({where:{businessId}});
  if(projection && isV2Plan(projection.plan)) {
    return prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${businessId} FOR UPDATE`;
      const sub=await tx.subscription.findUnique({where:{businessId}});
      const affiliate=await tx.affiliate.findUnique({where:{businessId}});
      if(!sub || !affiliate) return {success:false as const,error:"Afiliado o suscripción no encontrado"};
      if(hasPendingCommercialBenefit(sub) || await tx.prize.findFirst({where:{affiliateId:affiliate.id,status:"ACTIVE"}})) return {success:false as const,error:"Ya tienes un beneficio pendiente"};
      if(await tx.commercialBillingOperation.findFirst({where:{businessId,status:{in:["PREPARED","EXECUTING","UNKNOWN","AWAITING_PAYMENT","SCHEDULED","PAID"]}}})) return {success:false as const,error:"Espera a que termine la operación comercial pendiente"};
      const prize=await tx.prize.findFirst({where:{id:prizeId,affiliateId:affiliate.id,status:"AVAILABLE"}});
      if(!prize || (prize.type!=="PERCENTAGE" && prize.type!=="FREE_MONTH")) return {success:false as const,error:"Premio no disponible"};
      if(prize.type==="PERCENTAGE" && ![10,15,20,30,50].includes(prize.percentage ?? 0)) return {success:false as const,error:"Porcentaje de premio no válido"};
      if(prize.type==="FREE_MONTH" && ![1,3].includes(prize.freeMonths ?? 0)) return {success:false as const,error:"Meses de premio no válidos"};
      await tx.prize.update({where:{id:prize.id},data:{status:"ACTIVE"}});
      await tx.subscription.update({where:{id:sub.id},data:{activePrizeId:prize.id,pendingDiscountPercentage:prize.type==="PERCENTAGE"?prize.percentage:null,freeMonthsRemaining:prize.type==="FREE_MONTH"?prize.freeMonths!:0}});
      await tx.commercialEvent.create({data:{businessId,source:"v2_benefit_reservation",eventId:prize.id,operation:"PRIZE_RESERVED",outcome:"RECEIVED",occurredAt:new Date(),details:{prizeId:prize.id,percentage:prize.percentage,freeMonths:prize.freeMonths,consumed:false,providerValidated:false}}});
      return {success:true as const,pendingCommercialConfirmation:true as const};
    });
  }
  const reserved=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${businessId} FOR UPDATE`;
    const affiliate=await tx.affiliate.findUnique({where:{businessId}});
    const sub=await tx.subscription.findUnique({where:{businessId}});
    if(!affiliate || !sub) return {success:false as const,error:"Afiliado o suscripción no encontrado"};
    if(isV2Plan(sub.plan) || sub.paymentMethod==="BANK_TRANSFER" || !sub.mpSubscriptionId) return {success:false as const,error:"Contrato automático legacy requerido"};
    if(hasPendingCommercialBenefit(sub) || await tx.prize.findFirst({where:{affiliateId:affiliate.id,status:"ACTIVE"}})) return {success:false as const,error:"Ya tienes un beneficio pendiente"};
    const prize=await tx.prize.findFirst({where:{id:prizeId,affiliateId:affiliate.id,status:"AVAILABLE"}});
    if(!prize || (prize.type!=="PERCENTAGE" && prize.type!=="FREE_MONTH")) return {success:false as const,error:"Premio no disponible"};
    if(prize.type==="PERCENTAGE" && ![10,15,20,30,50].includes(prize.percentage ?? 0)) return {success:false as const,error:"Porcentaje de premio no válido"};
    if(prize.type==="FREE_MONTH" && ![1,3].includes(prize.freeMonths ?? 0)) return {success:false as const,error:"Meses de premio no válidos"};
    // Reserve the entire benefit before the provider PUT. An uncertain result
    // remains reserved and blocks a competing prize, without losing months.
    await tx.prize.update({where:{id:prize.id},data:{status:"ACTIVE"}});
    const percentage=prize.type==="FREE_MONTH"?100:prize.percentage!;
    await tx.subscription.update({where:{id:sub.id},data:{activePrizeId:prize.id,pendingDiscountPercentage:percentage,freeMonthsRemaining:prize.type==="FREE_MONTH"?prize.freeMonths!:0}});
    await tx.commercialEvent.create({data:{businessId,source:"legacy_benefit_reservation",eventId:prize.id,operation:"PRIZE_RESERVED",outcome:"RECEIVED",occurredAt:new Date(),providerReference:sub.mpSubscriptionId,details:{percentage,freeMonths:prize.freeMonths,consumed:false}}});
    return {success:true as const,percentage};
  },{maxWait:10000,timeout:60000});
  if(!reserved?.success) return reserved;
  // Commit the intent BEFORE remote I/O. A crash/timeout in this second
  // transaction leaves the complete reservation recoverable by invoice.
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${businessId} FOR UPDATE`;
    const sub=await tx.subscription.findUniqueOrThrow({where:{businessId}});
    if(sub.activePrizeId!==prizeId || sub.pendingDiscountPercentage!==reserved.percentage) return {success:false as const,error:"El premio ya fue conciliado o requiere revisión"};
    const result=await applyDiscount(businessId,reserved.percentage,tx,prizeId);
    return result.success ? {success:true as const}:result;
  },{maxWait:10000,timeout:60000});
}

/**
 * Get all prizes for a business's affiliate.
 */
export async function getUserPrizes(businessId: string) {
  const affiliate = await prisma.affiliate.findUnique({ where: { businessId } });
  if (!affiliate) return [];

  return prisma.prize.findMany({
    where: { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
  });
}
