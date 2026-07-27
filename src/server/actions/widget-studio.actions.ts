"use server";

import { revalidatePath } from "next/cache";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import {
  createDraftFromLegacy,
  getWidgetDraftSnapshot,
  publishWidgetDesign,
  restoreWidgetVersionToDraft,
  rollbackWidgetDesign,
  saveWidgetDraft,
  WidgetDesignValidationError,
  WidgetDraftConflictError,
} from "@/server/services/widget-design.service";
import {
  archiveWidgetAsset,
  uploadWidgetAsset,
} from "@/server/services/widget-assets.service";
import { prisma } from "@/server/db/prisma";
import { parseWidgetDesignDocument } from "@/core/widget-studio/schema";

async function requireWidgetStudioContext() {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("No autenticado.");
  const business = await getBusinessForUser(user.id);
  if (!business) throw new Error("No tienes un negocio.");
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.APPEARANCE_MANAGE))) {
    throw new Error("No tienes permisos para editar la apariencia.");
  }
  return { user, business };
}

function actionError(error: unknown) {
  if (error instanceof WidgetDraftConflictError) {
    return {
      error: error.message,
      code: "CONFLICT" as const,
      currentRevision: error.currentRevision,
    };
  }
  if (error instanceof WidgetDesignValidationError || error instanceof Error) {
    return { error: error.message, code: "VALIDATION" as const };
  }
  return { error: "Ocurrió un error inesperado.", code: "UNKNOWN" as const };
}

function revalidateWidgetStudio(slug: string) {
  revalidatePath("/dashboard/appearance/personalizado");
  revalidatePath("/dashboard/appearance/historial");
  revalidatePath("/dashboard/appearance/temas");
  revalidatePath(`/widget/${slug}`);
  revalidatePath(`/widget/${slug}/preview`);
}

export async function createWidgetStudioDraftAction() {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const design = await createDraftFromLegacy({
      businessId: business.id,
      userId: user.id,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const, designId: design.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveWidgetStudioDraftAction(input: {
  document: unknown;
  expectedRevision: number;
}) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    try {
      const result = await saveWidgetDraft({
        businessId: business.id,
        userId: user.id,
        document: input.document,
        expectedRevision: input.expectedRevision,
      });
      revalidatePath(`/widget/${business.slug}/preview`);
      return { success: true as const, ...result };
    } catch (error) {
      if (error instanceof WidgetDraftConflictError) {
        const latest = await getWidgetDraftSnapshot(business.id);
        return {
          error: error.message,
          code: "CONFLICT" as const,
          currentRevision: latest.revision,
          currentDocument: latest.document,
        };
      }
      throw error;
    }
  } catch (error) {
    return actionError(error);
  }
}

export async function publishWidgetStudioAction(input: {
  expectedRevision: number;
  summary?: string;
}) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const result = await publishWidgetDesign({
      businessId: business.id,
      userId: user.id,
      expectedRevision: input.expectedRevision,
      summary: input.summary,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const, ...result };
  } catch (error) {
    return actionError(error);
  }
}

export async function restoreWidgetStudioVersionAction(versionId: string) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const result = await restoreWidgetVersionToDraft({
      businessId: business.id,
      userId: user.id,
      versionId,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const, ...result };
  } catch (error) {
    return actionError(error);
  }
}

export async function rollbackWidgetStudioAction() {
  try {
    const { user, business } = await requireWidgetStudioContext();
    await rollbackWidgetDesign({ businessId: business.id, userId: user.id });
    revalidateWidgetStudio(business.slug);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadWidgetStudioAssetAction(formData: FormData) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Selecciona una imagen.");
    const asset = await uploadWidgetAsset({
      businessId: business.id,
      userId: user.id,
      file,
      altDefault: String(formData.get("alt") || ""),
    });
    revalidateWidgetStudio(business.slug);
    return {
      success: true as const,
      asset: {
        id: asset.id,
        url: asset.url,
        publicId: asset.publicId,
        provider: asset.provider,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        width: asset.width,
        height: asset.height,
        altDefault: asset.altDefault,
        status: asset.status,
        createdAt: asset.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function archiveWidgetStudioAssetAction(assetId: string) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    await archiveWidgetAsset({
      businessId: business.id,
      userId: user.id,
      assetId,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function applyThemeToWidgetStudioDraftAction(input: {
  themeId: string;
  expectedRevision: number;
}) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const [theme, design] = await Promise.all([
      prisma.widgetTheme.findFirst({
        where: { id: input.themeId, businessId: business.id },
      }),
      prisma.widgetDesign.findUnique({ where: { businessId: business.id } }),
    ]);
    if (!theme || !design) throw new Error("Tema o borrador no encontrado.");
    const document = parseWidgetDesignDocument(design.draftDocument);
    const nextDocument = {
      ...document,
      tokens: {
        ...document.tokens,
        colors: {
          primary: theme.primaryColor,
          secondary: theme.secondaryColor,
          background: theme.backgroundColor,
          text: theme.textColor,
          textMuted: theme.textMutedColor,
        },
        typography: {
          ...document.tokens.typography,
          baseSize: theme.fontSize,
        },
        shape: {
          radius: theme.cornerRadius,
          shadow: ["none", "soft", "strong"].includes(theme.shadowStyle)
            ? theme.shadowStyle as "none" | "soft" | "strong"
            : "soft",
        },
      },
      shell: {
        ...document.shell,
        headerAlign: ["left", "center", "right"].includes(theme.headerAlign)
          ? theme.headerAlign as "left" | "center" | "right"
          : "left",
      },
    };
    const result = await saveWidgetDraft({
      businessId: business.id,
      userId: user.id,
      document: nextDocument,
      expectedRevision: input.expectedRevision,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const, ...result };
  } catch (error) {
    return actionError(error);
  }
}

export async function applyPresetToWidgetStudioDraftAction(input: {
  expectedRevision: number;
  colors: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    textMutedColor: string;
  };
  fontSize: number;
  cornerRadius: number;
  shadowStyle: string;
  headerAlign: string;
}) {
  try {
    const { user, business } = await requireWidgetStudioContext();
    const design = await prisma.widgetDesign.findUnique({ where: { businessId: business.id } });
    if (!design) throw new Error("Primero crea un borrador en el Editor.");
    const document = parseWidgetDesignDocument(design.draftDocument);
    const nextDocument = {
      ...document,
      tokens: {
        ...document.tokens,
        colors: {
          primary: input.colors.primaryColor,
          secondary: input.colors.secondaryColor,
          background: input.colors.backgroundColor,
          text: input.colors.textColor,
          textMuted: input.colors.textMutedColor,
        },
        typography: {
          ...document.tokens.typography,
          baseSize: input.fontSize,
        },
        shape: {
          radius: input.cornerRadius,
          shadow: input.shadowStyle as "none" | "soft" | "strong",
        },
      },
      shell: {
        ...document.shell,
        headerAlign: input.headerAlign as "left" | "center" | "right",
      },
    };
    const result = await saveWidgetDraft({
      businessId: business.id,
      userId: user.id,
      document: nextDocument,
      expectedRevision: input.expectedRevision,
    });
    revalidateWidgetStudio(business.slug);
    return { success: true as const, ...result };
  } catch (error) {
    return actionError(error);
  }
}
