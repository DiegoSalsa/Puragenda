"use server";

import { revalidatePath } from "next/cache";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { requestReviewInvites } from "@/server/services/review-invitation.service";
import { publishReview, replyToReview, reportReview } from "@/server/services/reviews.service";
import { replyReviewSchema, reportReviewSchema, requestReviewInvitesSchema } from "@/server/validations/reviews";

async function requireReviewsManager() {
  const user = await getCurrentSessionUser();
  if (!user) return { ok: false as const, error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { ok: false as const, error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.REVIEWS_MANAGE))) {
    return { ok: false as const, error: "No tienes permisos para gestionar reseñas" };
  }
  return { ok: true as const, user, business };
}

export async function publishReviewAction(formData: FormData) {
  const auth = await requireReviewsManager();
  if (!auth.ok) return { error: auth.error };
  const reviewId = String(formData.get("reviewId") || "");
  if (!reviewId) return { error: "Reseña inválida" };
  const result = await publishReview({
    reviewId,
    businessId: auth.business.id,
    actorUserId: auth.user.id,
    reply: String(formData.get("reply") || "") || null,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard/reviews");
  revalidatePath("/negocios");
  return { ok: true as const };
}

export async function replyReviewAction(formData: FormData) {
  const auth = await requireReviewsManager();
  if (!auth.ok) return { error: auth.error };
  const parsed = replyReviewSchema.safeParse({
    reply: String(formData.get("reply") || ""),
    publish: formData.get("publish") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" };
  const reviewId = String(formData.get("reviewId") || "");
  if (!reviewId) return { error: "Reseña inválida" };
  const result = await replyToReview({
    reviewId,
    businessId: auth.business.id,
    actorUserId: auth.user.id,
    reply: parsed.data.reply,
    publish: parsed.data.publish,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard/reviews");
  revalidatePath("/negocios");
  return { ok: true as const };
}

export async function reportReviewAction(formData: FormData) {
  const auth = await requireReviewsManager();
  if (!auth.ok) return { error: auth.error };
  const parsed = reportReviewSchema.safeParse({
    reason: String(formData.get("reason") || ""),
    details: String(formData.get("details") || "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Selecciona un motivo." };
  const reviewId = String(formData.get("reviewId") || "");
  if (!reviewId) return { error: "Reseña inválida" };
  const result = await reportReview({
    reviewId,
    businessId: auth.business.id,
    actorUserId: auth.user.id,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard/reviews");
  return { ok: true as const };
}

export async function requestReviewInvitesAction(formData?: FormData) {
  const auth = await requireReviewsManager();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const rawIds = formData?.get("appointmentIds");
  const parsed = requestReviewInvitesSchema.safeParse({
    appointmentIds: typeof rawIds === "string" && rawIds
      ? rawIds.split(",").map((id) => id.trim()).filter(Boolean)
      : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" };
  const result = await requestReviewInvites({
    businessId: auth.business.id,
    actorUserId: auth.user.id,
    appointmentIds: parsed.data.appointmentIds,
  });
  revalidatePath("/dashboard/reviews");
  return result;
}
