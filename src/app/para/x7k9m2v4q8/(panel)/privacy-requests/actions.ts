"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { hashPrivacyEmail } from "@/lib/privacy/identity";

const STATUS_VALUES = ["RECEIVED", "IN_REVIEW", "FULFILLED", "DENIED"] as const;
const IDENTITY_VALUES = ["PENDING", "VERIFIED"] as const;

export async function updatePrivacyRequestStatus(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user?.isSuperAdmin || !user.adminAccess) throw new Error("Acceso denegado");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const identityStatus = String(formData.get("identityStatus") || "PENDING");
  const resolutionNotes = String(formData.get("resolutionNotes") || "").trim().slice(0, 4000);
  const responseChannel = String(formData.get("responseChannel") || "").trim().slice(0, 120);
  const responseContent = String(formData.get("responseContent") || "").trim().slice(0, 8000);
  const extensionRequested = formData.get("extensionUsed") === "on";
  const extensionNoticeSent = formData.get("extensionNoticeSent") === "on";
  const extensionNotes = String(formData.get("extensionNotes") || "").trim().slice(0, 2000);
  if (!id || !STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number]) || !IDENTITY_VALUES.includes(identityStatus as (typeof IDENTITY_VALUES)[number])) throw new Error("Solicitud inválida");
  if (status === "FULFILLED" && identityStatus !== "VERIFIED") throw new Error("Verifica la identidad antes de marcar la solicitud como atendida");
  if ((status === "FULFILLED" || status === "DENIED") && (!responseChannel || responseContent.length < 10)) {
    throw new Error("Registra el canal y el contenido de la respuesta antes de cerrar la solicitud");
  }

  const existing = await prisma.privacyRequest.findUnique({
    where: { id },
    select: {
      requestType: true,
      dueAt: true,
      extensionUsed: true,
      extensionNoticeSentAt: true,
      extensionNotes: true,
      responseSentAt: true,
      responseChannel: true,
      responseContent: true,
      resolvedAt: true,
      technicalActionAt: true,
    },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (status === "FULFILLED" && !existing.technicalActionAt) {
    throw new Error("Ejecuta y registra primero la acción técnica correspondiente");
  }
  if (extensionRequested && existing.requestType === "BLOCKING") throw new Error("El bloqueo temporal no admite prórroga");
  if (extensionRequested && !existing.extensionUsed && (status === "FULFILLED" || status === "DENIED")) {
    throw new Error("Registra la prórroga antes de cerrar la solicitud");
  }
  if (extensionRequested && !existing.extensionUsed && (!extensionNoticeSent || extensionNotes.length < 10)) {
    throw new Error("Registra la notificación y el motivo de la prórroga");
  }

  const now = new Date();
  const newExtension = extensionRequested && !existing.extensionUsed;
  const extensionUsed = existing.extensionUsed || extensionRequested;
  const responseIsFinal = status === "FULFILLED" || status === "DENIED";

  await prisma.$transaction(async (tx) => {
    await tx.privacyRequest.update({ where: { id }, data: {
      status,
      identityStatus,
      resolutionNotes: resolutionNotes || null,
      resolvedAt: responseIsFinal ? now : null,
      responseSentAt: responseIsFinal ? now : existing.responseSentAt,
      responseChannel: responseChannel || existing.responseChannel,
      responseContent: responseContent || existing.responseContent,
      dueAt: newExtension ? addDays(existing.dueAt, 30) : undefined,
      extensionUsed,
      extensionNoticeSentAt: extensionUsed
        ? existing.extensionNoticeSentAt || (extensionNoticeSent ? now : null)
        : null,
      extensionNotes: extensionNotes || existing.extensionNotes || null,
    } });
    if (status === "DENIED") {
      await tx.privacyRestriction.updateMany({ where: { sourceRequestId: id }, data: { active: false } });
    }
    await tx.auditLog.create({
      data: { userId: user.id, action: "PRIVACY_REQUEST_UPDATED", details: JSON.stringify({ requestId: id, status, identityStatus, extensionUsed }) },
    });
  });
  revalidatePath(`${ADMIN_SECRET_PATH}/privacy-requests`);
}

export async function executePrivacyTechnicalAction(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user?.isSuperAdmin || !user.adminAccess) throw new Error("Acceso denegado");
  const id = String(formData.get("id") || "");
  const evidence = String(formData.get("technicalActionEvidence") || "").trim().slice(0, 4000);
  const request = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Solicitud no encontrada");
  if (request.identityStatus !== "VERIFIED") throw new Error("Verifica la identidad antes de ejecutar acciones sobre datos");
  if (["ACCESS", "PORTABILITY"].includes(request.requestType)) {
    throw new Error("Genera la exportación descargable para registrar esta acción");
  }
  if (evidence.length < 10) throw new Error("Registra evidencia suficiente de la acción ejecutada");

  const now = new Date();
  const identityWhere = {
    OR: [
      ...(request.visitorId ? [{ visitorId: request.visitorId }] : []),
      ...(request.userId ? [{ userId: request.userId }] : []),
    ],
  };
  if (identityWhere.OR.length === 0 && ["SUPPRESSION", "OPPOSITION", "BLOCKING"].includes(request.requestType)) {
    throw new Error("No hay identificadores seudónimos vinculados para ejecutar la acción automáticamente");
  }

  await prisma.$transaction(async (tx) => {
    let technicalAction = request.requestType === "RECTIFICATION" ? "RECTIFICATION_VERIFIED" : "MANUAL_VERIFIED_ACTION";
    let deletedEvents = 0;
    let deletedConsents = 0;
    if (request.requestType === "SUPPRESSION") {
      deletedEvents = (await tx.trackingEvent.deleteMany({ where: identityWhere })).count;
      deletedConsents = (await tx.trackingConsent.deleteMany({ where: identityWhere })).count;
      technicalAction = "ANALYTICS_SUPPRESSION";
    } else if (["OPPOSITION", "BLOCKING"].includes(request.requestType)) {
      technicalAction = "ANALYTICS_RESTRICTION";
    }

    if (["SUPPRESSION", "OPPOSITION", "BLOCKING"].includes(request.requestType)) {
      await tx.privacyRestriction.upsert({
        where: { sourceRequestId: id },
        create: { sourceRequestId: id, emailHash: hashPrivacyEmail(request.email), visitorId: request.visitorId, userId: request.userId, reason: request.requestType, active: true },
        update: { reason: request.requestType, active: true },
      });
    }
    await tx.privacyRequest.update({
      where: { id },
      data: { technicalAction, technicalActionAt: now, technicalActionByUserId: user.id, technicalActionEvidence: evidence },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "PRIVACY_TECHNICAL_ACTION", details: JSON.stringify({ requestId: id, requestType: request.requestType, technicalAction, deletedEvents, deletedConsents }) },
    });
  });
  revalidatePath(`${ADMIN_SECRET_PATH}/privacy-requests`);
}
