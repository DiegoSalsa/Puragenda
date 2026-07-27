import { z } from "zod";

export const WIDGET_DOCUMENT_SCHEMA_VERSION = 1;
export const WIDGET_DOCUMENT_LIMITS = {
  maxBytes: 100 * 1024,
  maxSections: 20,
  maxBlocks: 50,
  maxDepth: 4,
} as const;

const idSchema = z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
const safeText = (max: number) => z.string().max(max);
const breakpointVisibilitySchema = z.object({
  mobile: z.boolean().default(true),
  tablet: z.boolean().default(true),
  desktop: z.boolean().default(true),
}).strict();

const commonBlockSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(60),
  hidden: z.boolean().default(false),
  locked: z.boolean().default(false),
  visibility: breakpointVisibilitySchema.default({
    mobile: true,
    tablet: true,
    desktop: true,
  }),
}).strict();

const focalPointSchema = z.object({
  x: z.number().finite().min(0).max(100).default(50),
  y: z.number().finite().min(0).max(100).default(50),
}).strict();

const assetPresentationSchema = z.object({
  fit: z.enum(["cover", "contain"]).default("cover"),
  aspectRatio: z.enum(["auto", "1:1", "4:3", "3:2", "16:9", "21:9"]).default("16:9"),
  focalPoint: focalPointSchema.default({ x: 50, y: 50 }),
  width: z.number().finite().min(20).max(100).default(100),
  radius: z.number().int().min(0).max(40).default(16),
  opacity: z.number().finite().min(0.1).max(1).default(1),
}).strict();

export const imageBlockSchema = commonBlockSchema.extend({
  type: z.literal("image"),
  assetId: idSchema,
  alt: safeText(240).default(""),
  decorative: z.boolean().default(false),
  caption: safeText(240).default(""),
  linkUrl: safeText(2048).default(""),
  mode: z.enum(["flow", "overlay"]).default("flow"),
  presentation: assetPresentationSchema.default({
    fit: "cover",
    aspectRatio: "16:9",
    focalPoint: { x: 50, y: 50 },
    width: 100,
    radius: 16,
    opacity: 1,
  }),
  overlay: z.object({
    x: z.number().finite().min(0).max(90).default(10),
    y: z.number().finite().min(0).max(90).default(10),
    width: z.number().finite().min(10).max(80).default(36),
    zIndex: z.number().int().min(1).max(5).default(2),
    mobileFallback: z.enum(["flow", "hidden", "scaled"]).default("flow"),
  }).strict().default({ x: 10, y: 10, width: 36, zIndex: 2, mobileFallback: "flow" }),
}).strict();

export const bannerBlockSchema = commonBlockSchema.extend({
  type: z.literal("banner"),
  assetId: idSchema.optional(),
  legacyImageUrl: safeText(2048).optional(),
  title: safeText(90).default("Nueva promoción"),
  subtitle: safeText(240).default(""),
  badge: safeText(32).default(""),
  ctaLabel: safeText(40).default(""),
  ctaUrl: safeText(2048).default(""),
  variant: z.enum(["overlay", "side", "top", "color", "compact"]).default("overlay"),
  align: z.enum(["left", "center", "right"]).default("left"),
  presentation: assetPresentationSchema.default({
    fit: "cover",
    aspectRatio: "16:9",
    focalPoint: { x: 50, y: 50 },
    width: 100,
    radius: 16,
    opacity: 1,
  }),
}).strict();

export const textBlockSchema = commonBlockSchema.extend({
  type: z.literal("text"),
  semantic: z.enum(["heading", "subheading", "paragraph", "label"]).default("paragraph"),
  content: safeText(1200).default("Escribe tu contenido aquí"),
  align: z.enum(["left", "center", "right"]).default("left"),
  size: z.enum(["xs", "sm", "base", "lg", "xl", "2xl"]).default("base"),
  color: z.enum(["text", "muted", "primary", "secondary"]).default("text"),
}).strict();

export const buttonBlockSchema = commonBlockSchema.extend({
  type: z.literal("button"),
  label: safeText(60).default("Conocer más"),
  action: z.enum(["external", "scroll-services", "next"]).default("scroll-services"),
  url: safeText(2048).default(""),
  newTab: z.boolean().default(false),
  variant: z.enum(["primary", "secondary", "outline", "ghost"]).default("primary"),
  align: z.enum(["left", "center", "right", "stretch"]).default("left"),
}).strict();

export const dividerBlockSchema = commonBlockSchema.extend({
  type: z.literal("divider"),
  style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
  thickness: z.number().int().min(1).max(4).default(1),
  width: z.number().finite().min(10).max(100).default(100),
}).strict();

export const spacerBlockSchema = commonBlockSchema.extend({
  type: z.literal("spacer"),
  size: z.enum(["xs", "sm", "md", "lg", "xl", "custom"]).default("md"),
  customPx: z.number().int().min(0).max(160).default(32),
}).strict();

export const widgetContentBlockSchema = z.discriminatedUnion("type", [
  imageBlockSchema,
  bannerBlockSchema,
  textBlockSchema,
  buttonBlockSchema,
  dividerBlockSchema,
  spacerBlockSchema,
]);

export const widgetSectionSchema = z.object({
  id: idSchema,
  type: z.literal("section"),
  name: z.string().trim().min(1).max(60),
  hidden: z.boolean().default(false),
  locked: z.boolean().default(false),
  layout: z.enum(["stack", "row", "columns"]).default("stack"),
  columns: z.enum(["1", "1-1", "1-2", "2-1", "1-1-1"]).default("1"),
  align: z.enum(["start", "center", "end", "stretch"]).default("stretch"),
  gap: z.number().int().min(0).max(64).default(16),
  padding: z.number().int().min(0).max(80).default(16),
  minHeight: z.number().int().min(0).max(800).default(0),
  backgroundColor: z.union([colorSchema, z.literal("transparent")]).default("transparent"),
  backgroundAssetId: idSchema.optional(),
  backgroundFit: z.enum(["cover", "contain"]).default("cover"),
  backgroundFocalPoint: focalPointSchema.default({ x: 50, y: 50 }),
  overlayColor: colorSchema.default("#000000"),
  overlayOpacity: z.number().finite().min(0).max(0.9).default(0),
  radius: z.number().int().min(0).max(40).default(0),
  visibility: breakpointVisibilitySchema.default({
    mobile: true,
    tablet: true,
    desktop: true,
  }),
  children: z.array(widgetContentBlockSchema).max(WIDGET_DOCUMENT_LIMITS.maxBlocks),
}).strict();

const slotSchema = z.array(widgetSectionSchema).max(WIDGET_DOCUMENT_LIMITS.maxSections);

export const widgetSystemSettingsSchema = z.object({
  header: z.object({
    showEyebrow: z.boolean().default(true),
    eyebrow: safeText(48).default("Reserva online"),
    showLogo: z.boolean().default(true),
    layout: z.enum(["compact", "standard", "centered"]).default("standard"),
  }).strict().default({
    showEyebrow: true,
    eyebrow: "Reserva online",
    showLogo: true,
    layout: "standard",
  }),
  progress: z.object({
    variant: z.enum(["tabs", "steps", "minimal"]).default("tabs"),
    showLabels: z.boolean().default(true),
  }).strict().default({ variant: "tabs", showLabels: true }),
  service: z.object({
    title: safeText(90).default("Selecciona un servicio"),
    description: safeText(240).default("Elige el servicio que quieras reservar."),
    layout: z.enum(["list", "grid"]).default("list"),
    columns: z.number().int().min(1).max(3).default(2),
    showImages: z.boolean().default(true),
    showDescription: z.boolean().default(true),
    showDuration: z.boolean().default(true),
    showPrice: z.boolean().default(true),
    density: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
    cardStyle: z.enum(["outlined", "soft", "elevated"]).default("outlined"),
  }).strict().default({
    title: "Selecciona un servicio",
    description: "Elige el servicio que quieras reservar.",
    layout: "list",
    columns: 2,
    showImages: true,
    showDescription: true,
    showDuration: true,
    showPrice: true,
    density: "comfortable",
    cardStyle: "outlined",
  }),
  staff: z.object({
    title: safeText(90).default("Elige un profesional"),
    description: safeText(240).default("Selecciona con quién quieres atenderte."),
    layout: z.enum(["list", "grid"]).default("grid"),
    showImages: z.boolean().default(true),
  }).strict().default({
    title: "Elige un profesional",
    description: "Selecciona con quién quieres atenderte.",
    layout: "grid",
    showImages: true,
  }),
  datetime: z.object({
    title: safeText(90).default("Elige fecha y hora"),
    description: safeText(240).default("Revisa la disponibilidad y selecciona un horario."),
    density: z.enum(["compact", "comfortable"]).default("comfortable"),
  }).strict().default({
    title: "Elige fecha y hora",
    description: "Revisa la disponibilidad y selecciona un horario.",
    density: "comfortable",
  }),
  details: z.object({
    title: safeText(90).default("Completa tus datos"),
    description: safeText(240).default("Usaremos estos datos para confirmar tu reserva."),
    labelStyle: z.enum(["above", "floating"]).default("above"),
  }).strict().default({
    title: "Completa tus datos",
    description: "Usaremos estos datos para confirmar tu reserva.",
    labelStyle: "above",
  }),
}).strict();

export const widgetDesignDocumentSchema = z.object({
  schemaVersion: z.literal(WIDGET_DOCUMENT_SCHEMA_VERSION),
  meta: z.object({
    name: z.string().trim().min(1).max(80),
    createdFrom: z.enum(["legacy", "blank", "template", "version"]).default("legacy"),
  }).strict(),
  tokens: z.object({
    colors: z.object({
      primary: colorSchema,
      secondary: colorSchema,
      background: colorSchema,
      text: colorSchema,
      textMuted: colorSchema,
    }).strict(),
    typography: z.object({
      family: z.enum(["system", "modern", "editorial", "rounded"]).default("system"),
      baseSize: z.number().int().min(12).max(20).default(14),
      scale: z.enum(["compact", "default", "expressive"]).default("default"),
    }).strict(),
    shape: z.object({
      radius: z.number().int().min(0).max(40).default(16),
      shadow: z.enum(["none", "soft", "strong"]).default("soft"),
    }).strict(),
    spacing: z.object({
      density: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
    }).strict(),
  }).strict(),
  shell: z.object({
    maxWidth: z.number().int().min(320).max(1200).default(672),
    headerAlign: z.enum(["left", "center", "right"]).default("left"),
    logoAssetId: idSchema.optional(),
    showPoweredBy: z.boolean().default(true),
  }).strict(),
  system: widgetSystemSettingsSchema.default({
    header: {
      showEyebrow: true,
      eyebrow: "Reserva online",
      showLogo: true,
      layout: "standard",
    },
    progress: { variant: "tabs", showLabels: true },
    service: {
      title: "Selecciona un servicio",
      description: "Elige el servicio que quieras reservar.",
      layout: "list",
      columns: 2,
      showImages: true,
      showDescription: true,
      showDuration: true,
      showPrice: true,
      density: "comfortable",
      cardStyle: "outlined",
    },
    staff: {
      title: "Elige un profesional",
      description: "Selecciona con quién quieres atenderte.",
      layout: "grid",
      showImages: true,
    },
    datetime: {
      title: "Elige fecha y hora",
      description: "Revisa la disponibilidad y selecciona un horario.",
      density: "comfortable",
    },
    details: {
      title: "Completa tus datos",
      description: "Usaremos estos datos para confirmar tu reserva.",
      labelStyle: "above",
    },
  }),
  globalSlots: z.object({
    beforeHeader: slotSchema.default([]),
    afterHeader: slotSchema.default([]),
    beforeFooter: slotSchema.default([]),
    afterFooter: slotSchema.default([]),
  }).strict(),
  stepSlots: z.record(
    z.string().max(40),
    z.object({
      beforeIntro: slotSchema.default([]),
      afterIntro: slotSchema.default([]),
      beforeMain: slotSchema.default([]),
      afterMain: slotSchema.default([]),
      beforeActions: slotSchema.default([]),
      afterActions: slotSchema.default([]),
    }).strict(),
  ).default({}),
}).strict();

export type WidgetDesignDocument = z.infer<typeof widgetDesignDocumentSchema>;
export type WidgetSystemSettings = z.infer<typeof widgetSystemSettingsSchema>;
export type WidgetSection = z.infer<typeof widgetSectionSchema>;
export type WidgetContentBlock = z.infer<typeof widgetContentBlockSchema>;
export type WidgetSlotName =
  | "beforeHeader"
  | "afterHeader"
  | "beforeFooter"
  | "afterFooter";

export type WidgetStepSlotName =
  | "beforeIntro"
  | "afterIntro"
  | "beforeMain"
  | "afterMain"
  | "beforeActions"
  | "afterActions";

export type WidgetAssetReferenceInput = {
  assetId: string;
  blockId: string;
  usage: "IMAGE" | "BACKGROUND" | "BANNER" | "POSTER";
};

export function parseWidgetDesignDocument(input: unknown): WidgetDesignDocument {
  const serialized = JSON.stringify(input);
  if (new TextEncoder().encode(serialized).byteLength > WIDGET_DOCUMENT_LIMITS.maxBytes) {
    throw new Error("El diseño supera el límite de 100 KB.");
  }
  const document = widgetDesignDocumentSchema.parse(input);
  validateDocumentSemantics(document);
  return document;
}

export function validateDocumentSemantics(document: WidgetDesignDocument) {
  const ids = new Set<string>();
  let sections = 0;
  let blocks = 0;
  const errors: string[] = [];

  visitDocumentSections(document, (section) => {
    sections += 1;
    if (ids.has(section.id)) errors.push(`El id ${section.id} está repetido.`);
    ids.add(section.id);
    for (const block of section.children) {
      blocks += 1;
      if (ids.has(block.id)) errors.push(`El id ${block.id} está repetido.`);
      ids.add(block.id);
      if (block.type === "image" && !block.decorative && !block.alt.trim()) {
        errors.push(`La imagen "${block.name}" necesita texto alternativo o marcarse como decorativa.`);
      }
      if (block.type === "button" && block.action === "external") {
        validateSafeExternalUrl(block.url, `El botón "${block.name}"`);
      }
      if (block.type === "banner" && block.ctaUrl) {
        validateSafeExternalUrl(block.ctaUrl, `El banner "${block.name}"`);
      }
      if (block.type === "banner" && block.legacyImageUrl) {
        validateSafeExternalUrl(block.legacyImageUrl, `La imagen del banner "${block.name}"`);
      }
      if (block.type === "image" && block.linkUrl) {
        validateSafeExternalUrl(block.linkUrl, `La imagen "${block.name}"`);
      }
    }
  });

  if (sections > WIDGET_DOCUMENT_LIMITS.maxSections) {
    errors.push(`Solo se permiten ${WIDGET_DOCUMENT_LIMITS.maxSections} secciones.`);
  }
  if (blocks > WIDGET_DOCUMENT_LIMITS.maxBlocks) {
    errors.push(`Solo se permiten ${WIDGET_DOCUMENT_LIMITS.maxBlocks} bloques.`);
  }
  if (errors.length) throw new Error(errors.join(" "));
}

function validateSafeExternalUrl(value: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} tiene un enlace inválido.`);
  }
  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error(`${label} solo puede usar HTTPS.`);
  }
}

export function visitDocumentSections(
  document: WidgetDesignDocument,
  visitor: (section: WidgetSection) => void,
) {
  const globalSlots = Object.values(document.globalSlots);
  const stepSlots = Object.values(document.stepSlots).flatMap((slots) => Object.values(slots));
  for (const section of [...globalSlots, ...stepSlots].flat()) visitor(section);
}

export function extractWidgetAssetReferences(document: WidgetDesignDocument): WidgetAssetReferenceInput[] {
  const references: WidgetAssetReferenceInput[] = [];
  if (document.shell.logoAssetId) {
    references.push({
      assetId: document.shell.logoAssetId,
      blockId: "widget_shell_logo",
      usage: "IMAGE",
    });
  }
  visitDocumentSections(document, (section) => {
    if (section.backgroundAssetId) {
      references.push({
        assetId: section.backgroundAssetId,
        blockId: section.id,
        usage: "BACKGROUND",
      });
    }
    for (const block of section.children) {
      if (block.type === "image") {
        references.push({ assetId: block.assetId, blockId: block.id, usage: "IMAGE" });
      }
      if (block.type === "banner" && block.assetId) {
        references.push({ assetId: block.assetId, blockId: block.id, usage: "BANNER" });
      }
    }
  });
  return references;
}

export function createWidgetNodeId(prefix: "section" | "image" | "banner" | "text" | "button" | "divider" | "spacer") {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
