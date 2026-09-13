"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdminSession } from "@/server/auth/admin-session";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { moderateReview } from "@/server/services/reviews.service";
import { moderateReviewSchema } from "@/server/validations/reviews";

export async function moderateReviewAction(formData: FormData) {
  const user = await requireSuperAdminSession();
  const parsed = moderateReviewSchema.safeParse({
    decision: String(formData.get("decision") || ""),
    notes: String(formData.get("notes") || "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" };
  const reviewId = String(formData.get("reviewId") || "");
  if (!reviewId) return { error: "Reseña inválida" };

  const result = await moderateReview({
    reviewId,
    actorUserId: user.id,
    decision: parsed.data.decision,
    notes: parsed.data.notes,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`${ADMIN_SECRET_PATH}/reviews`);
  revalidatePath("/negocios");
  return { ok: true as const };
}
