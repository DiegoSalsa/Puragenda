"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import {
  isSafeWidgetLinkUrl,
  normalizeWidgetShadowStyle,
  normalizeWidgetTextAlign,
} from "@/core/widget-studio";

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

const PROMO_PLACEMENTS = ["HEADER", "BETWEEN_SERVICES", "FOOTER"] as const;
type PromoPlacement = (typeof PROMO_PLACEMENTS)[number];

const promoBlockSelect = {
  id: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  linkUrl: true,
  placement: true,
  position: true,
  isVisible: true,
  textAlign: true,
  discountType: true,
  discountValue: true,
  discountStartsAt: true,
  discountEndsAt: true,
  discountMinSubtotal: true,
} satisfies Prisma.WidgetPromoBlockSelect;

async function listWidgetPromoBlocks(
  businessId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.widgetPromoBlock.findMany({
    where: { businessId },
    orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    select: promoBlockSelect,
  });
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePromoDiscount(formData: FormData) {
  const discountType = String(formData.get("discountType") || "");
  const enabled =
    String(formData.get("discountEnabled") || "") === "true" &&
    discountType !== "NONE";
  if (!enabled) {
    return {
      data: {
        discountType: null,
        discountValue: null,
        discountStartsAt: null,
        discountEndsAt: null,
        discountMinSubtotal: 0,
      },
    } as const;
  }

  const discountValue = Math.floor(Number(formData.get("discountValue") || 0));
  const discountMinSubtotal = Math.max(0, Math.floor(Number(formData.get("discountMinSubtotal") || 0)));
  const discountStartsAt = parseOptionalDate(formData.get("discountStartsAt"));
  const discountEndsAt = parseOptionalDate(formData.get("discountEndsAt"));

  if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
    return { error: "Selecciona un tipo de descuento válido" } as const;
  }
  if (discountValue <= 0) return { error: "El descuento debe ser mayor a 0" } as const;
  if (discountType === "PERCENTAGE" && discountValue > 100) {
    return { error: "El porcentaje no puede superar 100%" } as const;
  }
  if (discountStartsAt && discountEndsAt && discountStartsAt >= discountEndsAt) {
    return { error: "La fecha de término debe ser posterior al inicio" } as const;
  }

  return {
    data: {
      discountType,
      discountValue,
      discountStartsAt,
      discountEndsAt,
      discountMinSubtotal,
    },
  } as const;
}

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
      shadowStyle: normalizeWidgetShadowStyle(input.shadowStyle),
      headerAlign: normalizeWidgetTextAlign(input.headerAlign),
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
  await prisma.widgetTheme.create({
    data: {
      name: copyName,
      category: source.category,
      primaryColor: source.primaryColor,
      secondaryColor: source.secondaryColor,
      backgroundColor: source.backgroundColor,
      textColor: source.textColor,
      textMutedColor: source.textMutedColor,
      fontSize: source.fontSize,
      cornerRadius: source.cornerRadius,
      shadowStyle: source.shadowStyle,
      headerAlign: source.headerAlign,
      logoUrl: source.logoUrl,
      businessId: source.businessId,
    },
  });
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
  const placement = PROMO_PLACEMENTS.includes(placementInput as PromoPlacement)
    ? placementInput as PromoPlacement
    : "HEADER";
  const linkUrl = String(formData.get("linkUrl") || "").trim();
  if (linkUrl && !isSafeWidgetLinkUrl(linkUrl)) {
    return { error: "Usa un enlace http:// o https:// válido y sin credenciales" };
  }
  const textAlignInput = String(formData.get("textAlign") || "left");
  const textAlign = normalizeWidgetTextAlign(textAlignInput);
  const discount = parsePromoDiscount(formData);
  if ("error" in discount) return discount;

  let uploadedPublicId: string | null = null;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${bytes.toString("base64")}`;
    const { cloudinary } = await import("@/server/lib/cloudinary");
    const upload = await cloudinary.uploader.upload(base64, {
      resource_type: "image",
      folder: "puragenda_widget_promos",
      public_id: `business_${context.business.id}_${crypto.randomUUID()}`,
      transformation: [{ width: 1400, height: 700, crop: "limit" }],
      fetch_format: "auto",
      quality: "auto",
    });
    uploadedPublicId = upload.public_id;
    const nextPosition = await prisma.widgetPromoBlock.count({
      where: { businessId: context.business.id, placement },
    });
    const block = await prisma.widgetPromoBlock.create({
      data: {
        businessId: context.business.id,
        title,
        subtitle: String(formData.get("subtitle") || "").trim().slice(0, 180) || null,
        linkUrl: linkUrl || null,
        imageUrl: upload.secure_url,
        cloudinaryPublicId: upload.public_id,
        placement,
        position: nextPosition,
        textAlign,
        ...discount.data,
      },
      select: promoBlockSelect,
    });
    revalidatePath("/dashboard/appearance/personalizado");
    revalidatePath(`/widget/${context.business.slug}`);
    return {
      success: true,
      block,
      blocks: await listWidgetPromoBlocks(context.business.id),
    };
  } catch (error) {
    console.error("Widget promo upload error:", error);
    if (uploadedPublicId) {
      try {
        const { cloudinary } = await import("@/server/lib/cloudinary");
        await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: "image" });
      } catch (cleanupError) {
        console.error("Widget promo rollback cleanup error:", cleanupError);
      }
    }
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
    await prisma.$transaction(async (tx) => {
      const allBlocks = await tx.widgetPromoBlock.findMany({
        where: { businessId: context.business.id },
        orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }],
        select: { id: true, placement: true },
      });
      const groups = new Map<PromoPlacement, string[]>(
        PROMO_PLACEMENTS.map((placement) => [
          placement,
          allBlocks.filter((item) => item.placement === placement).map((item) => item.id),
        ]),
      );
      const currentPlacement = block.placement as PromoPlacement;
      const currentGroup = groups.get(currentPlacement) ?? [];
      const currentIndex = currentGroup.indexOf(block.id);
      if (currentIndex < 0) return;

      currentGroup.splice(currentIndex, 1);
      const placementIndex = PROMO_PLACEMENTS.indexOf(currentPlacement);
      let destinationPlacement = currentPlacement;
      let destinationIndex = currentIndex;

      if (data.direction === "up") {
        if (currentIndex > 0) {
          destinationIndex = currentIndex - 1;
        } else if (placementIndex > 0) {
          destinationPlacement = PROMO_PLACEMENTS[placementIndex - 1];
          destinationIndex = (groups.get(destinationPlacement) ?? []).length;
        } else {
          destinationIndex = 0;
        }
      } else if (currentIndex < currentGroup.length) {
        destinationIndex = currentIndex + 1;
      } else if (placementIndex < PROMO_PLACEMENTS.length - 1) {
        destinationPlacement = PROMO_PLACEMENTS[placementIndex + 1];
        destinationIndex = 0;
      } else {
        destinationIndex = currentGroup.length;
      }

      const destinationGroup = groups.get(destinationPlacement) ?? [];
      destinationGroup.splice(destinationIndex, 0, block.id);
      groups.set(destinationPlacement, destinationGroup);

      const updates = PROMO_PLACEMENTS.flatMap((placement) =>
        (groups.get(placement) ?? []).map((id, position) =>
          tx.widgetPromoBlock.update({
            where: { id },
            data: { placement, position },
          }),
        ),
      );
      await Promise.all(updates);
    });
  } else {
    const nextPosition = data.placement
      ? await prisma.widgetPromoBlock.count({
          where: { businessId: context.business.id, placement: data.placement },
        })
      : undefined;
    await prisma.widgetPromoBlock.update({
      where: { id: block.id },
      data: {
        ...(data.placement ? { placement: data.placement, position: nextPosition } : {}),
        ...(typeof data.isVisible === "boolean" ? { isVisible: data.isVisible } : {}),
      },
    });
  }
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath(`/widget/${context.business.slug}`);
  return {
    success: true,
    blocks: await listWidgetPromoBlocks(context.business.id),
  };
}

export async function updateWidgetPromoDiscountAction(blockId: string, formData: FormData) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const block = await prisma.widgetPromoBlock.findFirst({
    where: { id: blockId, businessId: context.business.id },
    select: { id: true },
  });
  if (!block) return { error: "Bloque no encontrado" };

  const discount = parsePromoDiscount(formData);
  if ("error" in discount) return discount;

  await prisma.widgetPromoBlock.update({
    where: { id: block.id },
    data: discount.data,
  });
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath(`/widget/${context.business.slug}`);
  return {
    success: true,
    blocks: await listWidgetPromoBlocks(context.business.id),
  };
}

export async function deleteWidgetPromoBlockAction(blockId: string) {
  const context = await getAppearanceContext();
  if ("error" in context) return context;
  const block = await prisma.widgetPromoBlock.findFirst({
    where: { id: blockId, businessId: context.business.id },
    select: { id: true, cloudinaryPublicId: true },
  });
  if (!block) return { error: "Bloque no encontrado" };

  await prisma.widgetPromoBlock.delete({ where: { id: block.id } });
  const remaining = await prisma.widgetPromoBlock.findMany({
    where: { businessId: context.business.id },
    orderBy: [{ placement: "asc" }, { position: "asc" }, { createdAt: "asc" }],
    select: { id: true, placement: true },
  });
  await prisma.$transaction(
    PROMO_PLACEMENTS.flatMap((placement) =>
      remaining
        .filter((item) => item.placement === placement)
        .map((item, position) =>
          prisma.widgetPromoBlock.update({
            where: { id: item.id },
            data: { position },
          }),
        ),
    ),
  );

  if (block.cloudinaryPublicId) {
    try {
      const { cloudinary } = await import("@/server/lib/cloudinary");
      await cloudinary.uploader.destroy(block.cloudinaryPublicId, { resource_type: "image" });
    } catch (error) {
      console.error("Widget promo cleanup error:", error);
    }
  }
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath(`/widget/${context.business.slug}`);
  return {
    success: true,
    blocks: await listWidgetPromoBlocks(context.business.id),
  };
}
