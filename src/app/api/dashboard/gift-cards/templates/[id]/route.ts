import { NextRequest } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { giftCardTemplateSchema } from "@/server/validations/gift-card";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiSessionUser(request);
  const business = user ? await getBusinessForUser(user.id) : null;
  if (!user || !business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.giftCardTemplate.findFirst({ where: { id, businessId: business.id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Gift Card no encontrada" }, { status: 404 });
  const parsed = giftCardTemplateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  const data = parsed.data;
  const serviceIds = [...new Set(data.services.map((item) => item.serviceId))];
  const valid = await prisma.service.count({ where: { id: { in: serviceIds }, businessId: business.id, bookingMode: "APPOINTMENT" } });
  if (valid !== serviceIds.length) return Response.json({ error: "Uno de los servicios no pertenece a tu negocio" }, { status: 400 });
  const template = await prisma.$transaction(async (tx) => {
    await tx.giftCardTemplateService.deleteMany({ where: { templateId: id } });
    return tx.giftCardTemplate.update({ where: { id }, data: {
      name: data.name, description: data.description || null, type: data.type, salePrice: data.salePrice,
      faceValue: data.type === "BALANCE" ? data.faceValue : null, isActive: data.isActive, isPublic: data.isPublic,
      designPreset: data.designPreset, backgroundColor: data.backgroundColor, accentColor: data.accentColor,
      textColor: data.textColor, imageUrl: data.imageUrl || null, shortMessage: data.shortMessage || null,
      services: data.type === "SERVICE" ? { create: data.services.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })) } : undefined,
    }, include: { services: { include: { service: { select: { id: true, name: true } } } } } });
  });
  return Response.json(template);
}
