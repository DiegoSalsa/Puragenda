import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextRequest } from "next/server";
import { getMercadoPagoCurrency, isMercadoPagoCurrencyCompatible } from "@/core/countries";
import { prisma } from "@/server/db/prisma";
import { giftCardClaimLimiter } from "@/server/lib/rate-limit";
import { createGiftCardPurchase } from "@/server/services/gift-card.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import { giftCardPurchaseDetailsSchema } from "@/server/validations/gift-card";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limited = giftCardClaimLimiter.check(request);
  if (limited) return limited;
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, countryCode: true, currencyCode: true } });
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  const parsed = giftCardPurchaseDetailsSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  const template = await prisma.giftCardTemplate.findFirst({ where: { id: parsed.data.templateId, businessId: business.id, isActive: true, isPublic: true }, select: { id: true } });
  if (!template) return Response.json({ error: "Gift Card no disponible" }, { status: 404 });
  const accessToken = await getValidMercadoPagoAccessToken(business.id);
  if (!accessToken) return Response.json({ error: "Este negocio aún no habilita la compra online de Gift Cards" }, { status: 409 });
  if (!isMercadoPagoCurrencyCompatible(business.countryCode, business.currencyCode)) {
    return Response.json({ error: `Mercado Pago requiere ${getMercadoPagoCurrency(business.countryCode) || "otra moneda"} para este negocio` }, { status: 409 });
  }

  const purchase = await createGiftCardPurchase({ businessId: business.id, ...parsed.data, paymentMethod: "MERCADOPAGO" });
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resultUrl = `${baseUrl}/widget/${business.slug}/gift-cards/resultado?purchaseId=${purchase.id}`;
    const preference = new Preference(new MercadoPagoConfig({ accessToken, options: { idempotencyKey: `gift-card-${purchase.id}` } }));
    const result = await preference.create({ body: {
      items: [{ id: purchase.id, title: purchase.templateNameSnapshot, description: `Gift Card de ${business.name}`, quantity: 1, unit_price: purchase.salePrice, currency_id: purchase.currencyCode }],
      payer: { name: purchase.buyerName, email: purchase.buyerEmail },
      back_urls: { success: `${resultUrl}&return=success`, failure: `${resultUrl}&return=failure`, pending: `${resultUrl}&return=pending` },
      ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
      external_reference: purchase.id,
      notification_url: `${baseUrl}/api/webhooks/gift-cards?businessId=${business.id}`,
      statement_descriptor: "PURAGENDA",
    } });
    const paymentUrl = result.init_point || result.sandbox_init_point;
    if (!paymentUrl) throw new Error("Mercado Pago no devolvió un enlace de pago");
    await prisma.giftCardPurchase.update({ where: { id: purchase.id }, data: { mpPreferenceId: result.id || null } });
    return Response.json({ paymentUrl, purchaseId: purchase.id }, { status: 201 });
  } catch (error) {
    await prisma.giftCardPurchase.updateMany({ where: { id: purchase.id, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED", mpStatus: "preference_error" } });
    console.error("[gift-card-checkout] Preference error", error);
    return Response.json({ error: "No pudimos iniciar el pago. Intenta nuevamente." }, { status: 502 });
  }
}
