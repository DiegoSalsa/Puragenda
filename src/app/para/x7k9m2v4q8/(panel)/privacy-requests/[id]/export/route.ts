import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getApiSessionUser(request);
  if (!user?.isSuperAdmin || !user.adminAccess) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await context.params;
  const privacyRequest = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!privacyRequest || privacyRequest.identityStatus !== "VERIFIED") {
    return NextResponse.json({ error: "La identidad debe estar verificada" }, { status: 409 });
  }

  const email = privacyRequest.email.toLowerCase();
  const [accounts, portalAccounts, clients, appointments, events, consents] = await Promise.all([
    prisma.user.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true, termsAcceptedAt: true, deletedAt: true },
    }),
    prisma.clientPortalAccount.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true, phone: true, rut: true, defaultAddress: true, emailVerifiedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.client.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, businessId: true, email: true, name: true, phone: true, rut: true, acceptsMarketing: true, createdAt: true, updatedAt: true },
    }),
    prisma.appointment.findMany({
      where: { customerEmail: { equals: email, mode: "insensitive" } },
      select: { id: true, businessId: true, customerName: true, customerEmail: true, customerPhone: true, customerAddress: true, startTime: true, endTime: true, status: true, paymentStatus: true, totalPrice: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trackingEvent.findMany({
      where: { OR: [
        ...(privacyRequest.visitorId ? [{ visitorId: privacyRequest.visitorId }] : []),
        ...(privacyRequest.userId ? [{ userId: privacyRequest.userId }] : []),
      ] },
      select: { event: true, occurredAt: true, path: true, referrerDomain: true, utmSource: true, utmMedium: true, utmCampaign: true, properties: true, consentVersion: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.trackingConsent.findMany({
      where: { OR: [
        ...(privacyRequest.visitorId ? [{ visitorId: privacyRequest.visitorId }] : []),
        ...(privacyRequest.userId ? [{ userId: privacyRequest.userId }] : []),
      ] },
      select: { decision: true, policyVersion: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const generatedAt = new Date();
  await prisma.$transaction([
    prisma.privacyRequest.update({
      where: { id },
      data: { exportGeneratedAt: generatedAt, technicalAction: "DATA_EXPORT", technicalActionAt: generatedAt, technicalActionByUserId: user.id, technicalActionEvidence: "Exportación JSON generada desde datos localizados por correo e identificadores seudónimos." },
    }),
    prisma.auditLog.create({
      data: { userId: user.id, action: "PRIVACY_DATA_EXPORT", details: JSON.stringify({ requestId: id, generatedAt }) },
    }),
  ]);

  const body = JSON.stringify({
    metadata: { requestReference: id.slice(-8).toUpperCase(), generatedAt, formatVersion: 1 },
    data: { accounts, portalAccounts, clients, appointments, analytics: { events, consents } },
  }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="puragenda-datos-${id.slice(-8)}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
