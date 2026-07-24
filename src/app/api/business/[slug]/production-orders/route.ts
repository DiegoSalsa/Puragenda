import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { productionOrderSchema } from "@/server/validations/booking";
import { bookingLimiter } from "@/server/lib/rate-limit";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  ACTIVE_PRODUCTION_STATUSES,
  getProductionWindows,
} from "@/server/services/production-window.service";

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const blocked = bookingLimiter.check(request);
  if (blocked) return blocked;

  const { slug } = await params;
  try {
    const body = await request.json();
    const parsed = productionOrderSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Revisa los datos del encargo", details: parsed.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }

    const business = await getBusinessBySlug(slug);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!business.productionOrdersEnabled) {
      return Response.json({ error: "Los encargos no están habilitados" }, { status: 404 });
    }
    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) {
      return Response.json({ error: "API Key invalida" }, { status: 401 });
    }

    const data = parsed.data;
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, businessId: business.id, bookingMode: "PRODUCTION" },
      include: {
        optionCategories: {
          orderBy: { position: "asc" },
          include: { alternatives: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!service) return Response.json({ error: "Servicio de encargo no encontrado" }, { status: 404 });
    if (service.requiresReferenceImages && data.referenceImageUrls.length === 0) {
      return Response.json({ error: "Sube al menos una foto de referencia" }, { status: 400 });
    }

    const availableWindows = await getProductionWindows(service);
    const selectedWindow = availableWindows.find(
      (window) => window.key === data.productionWindowKey && window.startDate === data.productionWeek,
    );
    if (!selectedWindow || selectedWindow.available <= 0) {
      return Response.json({ error: "El período seleccionado no está disponible" }, { status: 400 });
    }
    const requestedWeek = dateOnly(selectedWindow.startDate);
    const requestedEnd = dateOnly(selectedWindow.endDate);

    const requestedOptionIds = new Set(data.selectedOptionAlternativeIds);
    const matchedOptionIds = new Set<string>();
    let totalPrice = Number(service.price);
    const selectedOptions: {
      categoryName: string;
      alternativeName: string;
      priceDelta: number;
    }[] = [];

    for (const category of service.optionCategories) {
      const selected = category.alternatives.filter((alternative) => requestedOptionIds.has(alternative.id));
      if (selected.length > category.maxSelections) {
        return Response.json({ error: `Puedes elegir hasta ${category.maxSelections} opcion(es) en ${category.name}` }, { status: 400 });
      }
      if (category.isRequired && selected.length === 0) {
        return Response.json({ error: `Debes elegir una opcion en ${category.name}` }, { status: 400 });
      }
      for (const alternative of selected) {
        matchedOptionIds.add(alternative.id);
        totalPrice += Number(alternative.priceDelta);
        selectedOptions.push({
          categoryName: category.name,
          alternativeName: alternative.name,
          priceDelta: Number(alternative.priceDelta),
        });
      }
    }
    if (matchedOptionIds.size !== requestedOptionIds.size) {
      return Response.json({ error: "Una de las opciones seleccionadas no es valida" }, { status: 400 });
    }

    const depositAmount = Math.round(totalPrice * service.productionDepositPercent / 100);
    const balanceAmount = Math.max(0, Math.round(totalPrice - depositAmount));
    const orderNumber = `ENC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${service.id}:${selectedWindow.key}`}))`;

      const occupied = await tx.productionOrder.count({
        where: {
          serviceId: service.id,
          status: { in: [...ACTIVE_PRODUCTION_STATUSES] },
          ...(selectedWindow.scheduleMode === "CUSTOM"
            ? { productionWindowKey: selectedWindow.key }
            : {
                OR: [
                  { productionWindowKey: selectedWindow.key },
                  { productionWindowKey: null, productionWeek: requestedWeek },
                ],
              }),
        },
      });
      if (occupied >= selectedWindow.capacity) {
        throw new Error("PRODUCTION_WEEK_FULL");
      }

      const client = await tx.client.upsert({
        where: { businessId_email: { businessId: business.id, email: data.customerEmail } },
        update: { name: data.customerName, phone: data.customerPhone },
        create: {
          businessId: business.id,
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
      });

      return tx.productionOrder.create({
        data: {
          orderNumber,
          businessId: business.id,
          serviceId: service.id,
          clientId: client.id,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          petName: data.petName,
          petDetails: data.petDetails,
          referenceImageUrls: data.referenceImageUrls,
          productionWeek: requestedWeek,
          productionWindowKey: selectedWindow.key,
          productionWindowLabel: selectedWindow.label,
          productionWindowEnd: requestedEnd,
          selectedOptions,
          totalPrice,
          depositAmount,
          balanceAmount,
          depositPaymentStatus: depositAmount > 0 ? "PENDING" : "NONE",
          status: depositAmount > 0 ? "AWAITING_DEPOSIT" : "QUEUED",
          deliveryMethod: data.deliveryMethod,
          customerAddress: data.customerAddress,
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 5000,
    });

    let paymentUrl: string | null = null;
    if (order.depositAmount > 0 && business.mpAccessToken) {
      try {
        const baseUrl = process.env.NODE_ENV === "production"
          ? (process.env.NEXT_PUBLIC_APP_URL || "https://www.puragenda.cl")
          : request.nextUrl.origin;
        const preference = new Preference(new MercadoPagoConfig({ accessToken: business.mpAccessToken }));
        const preferenceResult = await preference.create({
          body: {
            items: [{
              id: order.id,
              title: `Abono - ${service.name}`,
              description: `Encargo ${order.orderNumber} para ${data.petName}`,
              quantity: 1,
              unit_price: order.depositAmount,
              currency_id: "CLP",
            }],
            back_urls: {
              success: `${baseUrl}/api/mercadopago/production-return?orderId=${order.id}`,
              failure: `${baseUrl}/api/mercadopago/production-return?orderId=${order.id}`,
              pending: `${baseUrl}/api/mercadopago/production-return?orderId=${order.id}`,
            },
            ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
            external_reference: `production:${order.id}`,
            ...(baseUrl.startsWith("https://") ? {
              notification_url: `${baseUrl}/api/webhooks/production-deposit?orderId=${order.id}`,
            } : {}),
            statement_descriptor: "PURAGENDA",
          },
        });
        paymentUrl = preferenceResult.init_point || preferenceResult.sandbox_init_point || null;
        if (paymentUrl) {
          await prisma.productionOrder.update({
            where: { id: order.id },
            data: { depositMpPreferenceId: preferenceResult.id || null },
          });
        }
      } catch (paymentError) {
        console.error("[production-orders] Mercado Pago preference error:", paymentError);
      }
    }

    return Response.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      depositAmount: order.depositAmount,
      balanceAmount: order.balanceAmount,
      paymentMode: paymentUrl ? "ONLINE" : "MANUAL",
      paymentUrl,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCTION_WEEK_FULL") {
      return Response.json({ error: "Ese período acaba de completarse. Elige otro." }, { status: 409 });
    }
    console.error("[production-orders] Error:", error);
    return Response.json({ error: "No se pudo crear el encargo" }, { status: 500 });
  }
}
