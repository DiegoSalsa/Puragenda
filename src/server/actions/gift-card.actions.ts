"use server";

import crypto from "node:crypto";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const GIFT_CARD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const GIFT_CARD_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export async function uploadGiftCardImageAssetAction(formData: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.GIFT_CARDS_MANAGE))) {
    return { error: "No tienes permisos para gestionar Gift Cards" };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona una imagen" };
  if (!GIFT_CARD_IMAGE_TYPES.includes(file.type)) {
    return { error: "Formato no soportado. Usa PNG, JPG o WebP." };
  }
  if (file.size > GIFT_CARD_IMAGE_MAX_SIZE) {
    return { error: "La imagen es muy pesada. Máximo 5 MB." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
    const { cloudinary } = await import("@/server/lib/cloudinary");
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: "puragenda_gift_cards",
      public_id: `business_${business.id}_gift_card_${crypto.randomUUID()}`,
      transformation: [{ width: 1200, height: 1200, crop: "limit" }],
      fetch_format: "auto",
      quality: "auto",
    });

    return { success: true, url: uploaded.secure_url };
  } catch (error) {
    console.error("Gift Card image upload error:", error);
    return { error: "No se pudo subir la imagen. Inténtalo nuevamente." };
  }
}
