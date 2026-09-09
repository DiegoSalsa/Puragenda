import { z } from "zod";

const email = z.string().trim().email().max(254);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionalField = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  schema.optional(),
);

export const giftCardTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().default(""),
  type: z.enum(["BALANCE", "SERVICE"]),
  salePrice: z.coerce.number().int().positive().max(100_000_000),
  faceValue: z.coerce.number().int().positive().max(100_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  designPreset: z.string().trim().min(1).max(40).default("classic"),
  backgroundColor: color.default("#FFF5BA"),
  accentColor: color.default("#FF8FAB"),
  textColor: color.default("#111111"),
  imageUrl: z.union([z.string().url().max(1000), z.literal("")]).optional(),
  shortMessage: z.string().trim().max(160).optional(),
  services: z.array(z.object({ serviceId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100) })).max(20).default([]),
}).superRefine((value, ctx) => {
  if (value.type === "BALANCE" && !value.faceValue) ctx.addIssue({ code: "custom", path: ["faceValue"], message: "El valor es obligatorio" });
  if (value.type === "SERVICE" && value.services.length === 0) ctx.addIssue({ code: "custom", path: ["services"], message: "Selecciona al menos un servicio" });
});

export const giftCardPurchaseDetailsSchema = z.object({
  templateId: z.string().min(1),
  buyerName: z.string().trim().min(2).max(100),
  buyerEmail: email,
  deliveryMode: z.enum(["SELF", "GIFT"]),
  recipientName: optionalField(z.string().trim().min(2).max(100)),
  recipientEmail: optionalField(email),
  senderName: optionalField(z.string().trim().min(2).max(100)),
  giftMessage: optionalField(z.string().trim().max(500)),
}).superRefine((value, ctx) => {
  if (value.deliveryMode === "GIFT") {
    if (!value.recipientName) ctx.addIssue({ code: "custom", path: ["recipientName"], message: "Ingresa el destinatario" });
    if (!value.recipientEmail) ctx.addIssue({ code: "custom", path: ["recipientEmail"], message: "Ingresa el correo del destinatario" });
    if (!value.senderName) ctx.addIssue({ code: "custom", path: ["senderName"], message: "Ingresa el nombre visible del remitente" });
  }
});

export const manualGiftCardSaleSchema = giftCardPurchaseDetailsSchema.and(z.object({
  manualPaymentMethod: z.enum(["TRANSFER", "CASH", "OTHER"]),
}));
