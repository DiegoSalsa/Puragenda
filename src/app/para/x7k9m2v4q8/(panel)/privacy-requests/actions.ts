"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { ADMIN_SECRET_PATH } from "@/core/constants";

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
  if (!id || !STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number]) || !IDENTITY_VALUES.includes(identityStatus as (typeof IDENTITY_VALUES)[number])) throw new Error("Solicitud inválida");
  if (status === "FULFILLED" && identityStatus !== "VERIFIED") throw new Error("Verifica la identidad antes de marcar la solicitud como atendida");
  if ((status === "FULFILLED" || status === "DENIED") && (!responseChannel || responseContent.length < 10)) {
    throw new Error("Registra el canal y el contenido de la respuesta antes de cerrar la solicitud");
  }

  await prisma.privacyRequest.update({
    where: { id },
    data: {
      status,
      identityStatus,
      resolutionNotes: resolutionNotes || null,
      resolvedAt: status === "FULFILLED" || status === "DENIED" ? new Date() : null,
      responseSentAt: status === "FULFILLED" || status === "DENIED" ? new Date() : null,
      responseChannel: responseChannel || null,
      responseContent: responseContent || null,
    },
  });
  revalidatePath(`${ADMIN_SECRET_PATH}/privacy-requests`);
}
