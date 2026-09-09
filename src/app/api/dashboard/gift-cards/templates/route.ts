import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { giftCardTemplateSchema } from "@/server/validations/gift-card";

async function context(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return null;
  const business = await getBusinessForUser(user.id);
  if (!business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return null;
  return { user, business };
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return Response.json({ error: "Sin acceso" }, { status: 403 });
  return Response.json(await prisma.giftCardTemplate.findMany({ where: { businessId: ctx.business.id }, include: { services: { include: { service: { select: { id: true, name: true } } } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }));
}

export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const parsed = giftCardTemplateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  const data = parsed.data;
  const uniqueIds = [...new Set(data.services.map((item) => item.serviceId))];
  const services = await prisma.service.findMany({ where: { id: { in: uniqueIds }, businessId: ctx.business.id, bookingMode: "APPOINTMENT" }, select: { id: true } });
  if (services.length !== uniqueIds.length) return Response.json({ error: "Uno de los servicios no pertenece a tu negocio" }, { status: 400 });
  const template = await prisma.giftCardTemplate.create({ data: {
    businessId: ctx.business.id, name: data.name, description: data.description || null, type: data.type,
    salePrice: data.salePrice, faceValue: data.type === "BALANCE" ? data.faceValue : null, currencyCode: ctx.business.currencyCode,
    isActive: data.isActive, isPublic: data.isPublic, designPreset: data.designPreset,
    backgroundColor: data.backgroundColor, accentColor: data.accentColor, textColor: data.textColor,
    imageUrl: data.imageUrl || null, shortMessage: data.shortMessage || null,
    services: data.type === "SERVICE" ? { create: data.services.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })) } : undefined,
  }, include: { services: { include: { service: { select: { id: true, name: true } } } } } });
  return Response.json(template, { status: 201 });
}
