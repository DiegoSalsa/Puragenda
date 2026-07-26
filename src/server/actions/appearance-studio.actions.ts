"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

type ThemeInput = {
  name: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textMutedColor: string;
  fontSize: number;
  cornerRadius: number;
  shadowStyle: string;
  headerAlign: string;
  logoUrl?: string;
};

async function getAppearanceContext() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" } as const;
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" } as const;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    return { error: "No tienes permisos para editar la apariencia" } as const;
  }
  return { user, business } as const;
}

function cleanThemeInput(input: ThemeInput) {
  const colorPattern = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
  const colors = [
    input.primaryColor,
    input.secondaryColor,
    input.backgroundColor,
    input.textColor,
    input.textMutedColor,
  ];
  if (!colors.every((color) => colorPattern.test(color))) return { error: "Revisa los colores del tema" } as const;
  const name = input.name.trim().slice(0, 60);
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres" } as const;
  return {
    data: {
      name,
      category: input.category.trim().slice(0, 40) || "Personalizado",
      primaryColor: input.primaryColor.toUpperCase(),
      secondaryColor: input.secondaryColor.toUpperCase(),
      backgroundColor: input.backgroundColor.toUpperCase(),
      textColor: input.textColor.toUpperCase(),
      textMutedColor: input.textMutedColor.toUpperCase(),
      fontSize: Math.max(10, Math.min(24, Math.floor(input.fontSize))),
      cornerRadius: Math.max(0, Math.min(40, Math.floor(input.cornerRadius))),
      shadowStyle: ["none", "soft", "strong"].includes(input.shadowStyle) ? input.shadowStyle : "soft",
      headerAlign: ["left", "center", "right"].includes(input.headerAlign) ? input.headerAlign : "left",
      logoUrl: input.logoUrl?.trim() || null,
    },
  } as const;
}

export async function createWidgetThemeAction(input: ThemeInput) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const cleaned = cleanThemeInput(input);
  if ("error" in cleaned) return cleaned;
  try {
    const theme = await prisma.widgetTheme.create({
      data: { ...cleaned.data, businessId: context.business.id },
    });
    revalidatePath("/dashboard/appearance/temas");
    return { success: true, theme };
  } catch {
    return { error: "Ya existe un tema guardado con ese nombre" };
  }
}

export async function duplicateWidgetThemeAction(themeId: string) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const source = await prisma.widgetTheme.findFirst({
    where: { id: themeId, businessId: context.business.id },
  });
  if (!source) return { error: "Tema no encontrado" };
  let copyName = `${source.name} copia`;
  let suffix = 2;
  while (await prisma.widgetTheme.findFirst({ where: { businessId: context.business.id, name: copyName } })) {
    copyName = `${source.name} copia ${suffix++}`;
  }
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = source;
  await prisma.widgetTheme.create({ data: { ...copy, name: copyName } });
  revalidatePath("/dashboard/appearance/temas");
  return { success: true };
}

export async function deleteWidgetThemeAction(themeId: string) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const result = await prisma.widgetTheme.deleteMany({
    where: { id: themeId, businessId: context.business.id },
  });
  if (!result.count) return { error: "Tema no encontrado" };
  revalidatePath("/dashboard/appearance/temas");
  return { success: true };
}

export async function createWidgetPromoBlockAction(formData: FormData) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { error: "Selecciona una imagen promocional" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Usa una imagen PNG, JPG o WebP" };
  }
  if (file.size > 8 * 1024 * 1024) return { error: "La imagen no puede superar 8 MB" };

  const title = String(formData.get("title") || "").trim().slice(0, 90);
  if (title.length < 2) return { error: "Escribe un título para el bloque" };
  const placementInput = String(formData.get("placement") || "HEADER");
  const placement = ["HEADER", "BETWEEN_SERVICES", "FOOTER"].includes(placementInput)
    ? placementInput as "HEADER" | "BETWEEN_SERVICES" | "FOOTER"
    : "HEADER";
  const linkUrl = String(formData.get("linkUrl") || "").trim();
  if (linkUrl && !/^https?:\/\//i.test(linkUrl)) return { error: "El enlace debe comenzar con http:// o https://" };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${bytes.toString("base64")}`;
    const { cloudinary } = await import("@/server/lib/cloudinary");
    const upload = await cloudinary.uploader.upload(base64, {
      folder: "puragenda_widget_promos",
      public_id: `business_${context.business.id}_${crypto.randomUUID()}`,
      transformation: [{ width: 1400, height: 700, crop: "limit" }],
      fetch_format: "auto",
      quality: "auto",
    });
    const nextPosition = await prisma.widgetPromoBlock.count({
      where: { businessId: context.business.id, placement },
    });
    await prisma.widgetPromoBlock.create({
      data: {
        businessId: context.business.id,
        title,
        subtitle: String(formData.get("subtitle") || "").trim().slice(0, 180) || null,
        linkUrl: linkUrl || null,
        imageUrl: upload.secure_url,
        placement,
        position: nextPosition,
        textAlign: String(formData.get("textAlign") || "left"),
      },
    });
    revalidatePath("/dashboard/appearance/personalizado");
    revalidatePath(`/widget/${context.business.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Widget promo upload error:", error);
    return { error: "No se pudo subir la imagen promocional" };
  }
}

export async function updateWidgetPromoBlockAction(
  blockId: string,
  data: { placement?: "HEADER" | "BETWEEN_SERVICES" | "FOOTER"; isVisible?: boolean; direction?: "up" | "down" },
) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const block = await prisma.widgetPromoBlock.findFirst({
    where: { id: blockId, businessId: context.business.id },
  });
  if (!block) return { error: "Bloque no encontrado" };

  if (data.direction) {
    const sibling = await prisma.widgetPromoBlock.findFirst({
      where: {
        businessId: context.business.id,
        placement: block.placement,
        position: data.direction === "up" ? { lt: block.position } : { gt: block.position },
      },
      orderBy: { position: data.direction === "up" ? "desc" : "asc" },
    });
    if (sibling) {
      await prisma.$transaction([
        prisma.widgetPromoBlock.update({ where: { id: block.id }, data: { position: sibling.position } }),
        prisma.widgetPromoBlock.update({ where: { id: sibling.id }, data: { position: block.position } }),
      ]);
    }
  } else {
    await prisma.widgetPromoBlock.update({
      where: { id: block.id },
      data: {
        ...(data.placement ? { placement: data.placement, position: 0 } : {}),
        ...(typeof data.isVisible === "boolean" ? { isVisible: data.isVisible } : {}),
      },
    });
  }
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath(`/widget/${context.business.slug}`);
  return { success: true };
}

export async function deleteWidgetPromoBlockAction(blockId: string) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const result = await prisma.widgetPromoBlock.deleteMany({
    where: { id: blockId, businessId: context.business.id },
  });
  if (!result.count) return { error: "Bloque no encontrado" };
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath(`/widget/${context.business.slug}`);
  return { success: true };
}
