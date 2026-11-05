import { z } from "zod";
import { STAFF_LIMITS } from "@/core/constants";
import { COMMERCIAL_MAX_PROFESSIONALS } from "@/core/commercial-catalog";
import { registrationMarketSchema } from "@/core/registration-market";
import { registrationMarketplaceShapeErrors } from "@/lib/marketplace/onboarding";

export const registerSchema = z.object({
  commercialPlanIntent: z.enum(["PURAGENDA", "PURAGENDA_PLUS"]).optional(),
  professionalTotal: z.number().int().min(1).max(COMMERCIAL_MAX_PROFESSIONALS).optional(),
  websiteIntent: z.boolean().optional().default(false),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional().default("MONTHLY"),
  email: z
    .string({ message: "El email es obligatorio" })
    .email("Debe ser un email válido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ message: "La contraseña es obligatoria" })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no debe exceder 128 caracteres"),

  name: z
    .string({ message: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),

  businessName: z
    .string({ message: "El nombre del negocio es obligatorio" })
    .min(2, "El nombre del negocio debe tener al menos 2 caracteres")
    .max(100, "El nombre del negocio no debe exceder 100 caracteres")
    .trim(),

  ...registrationMarketSchema.shape,

  referralCode: z
    .string()
    .max(20)
    .trim()
    .toUpperCase()
    .optional()
    .nullable(),

  extraStaffCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(0),

  planIntent: z
    .enum(["INDIVIDUAL", "EQUIPO", "PURAGENDA", "PURAGENDA_PLUS"])
    .optional()
    .nullable(),

  marketplaceCategorySlug: z
    .string({ message: "Selecciona el rubro del negocio" })
    .trim()
    .toLowerCase()
    .min(1, "Selecciona el rubro del negocio")
    .max(64),

  marketplaceOtherDescription: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable(),

  marketplaceLocalitySlug: z
    .string()
    .trim()
    .toLowerCase()
    .max(64)
    .optional()
    .nullable(),

  marketplaceLocalityNotFound: z.boolean().optional().default(false),

  marketplaceCityName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),

  marketplaceAuthorized: z.boolean().optional().default(false),

  termsAccepted: z.literal(true, { error: "Debes aceptar los Términos de Servicio" }),
}).superRefine((data, ctx) => {
  if (data.commercialPlanIntent && (data.planIntent === "PURAGENDA" || data.planIntent === "PURAGENDA_PLUS") && data.planIntent !== data.commercialPlanIntent) {
    ctx.addIssue({ code: "custom", message: "La selección de plan es inconsistente" });
  }
  if (!data.professionalTotal && data.planIntent === "EQUIPO" && STAFF_LIMITS.EQUIPO + data.extraStaffCount > COMMERCIAL_MAX_PROFESSIONALS) ctx.addIssue({ code: "custom", message: "La cantidad de profesionales supera el máximo del catálogo público" });
  const errors = registrationMarketplaceShapeErrors({
    countryCode: data.countryCode,
    categorySlug: data.marketplaceCategorySlug,
    otherDescription: data.marketplaceOtherDescription,
    localitySlug: data.marketplaceLocalitySlug,
    localityNotFound: data.marketplaceLocalityNotFound,
    cityName: data.marketplaceCityName,
    authorized: data.marketplaceAuthorized,
  });
  for (const message of errors) {
    ctx.addIssue({ code: "custom", message });
  }
});

export const loginSchema = z.object({
  email: z
    .string({ message: "El email es obligatorio" })
    .email("Debe ser un email válido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ message: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
    .max(128, "La contraseña no debe exceder 128 caracteres"),
});

export const adminCodeRequestSchema = z.object({
  email: z
    .string({ message: "El email es obligatorio" })
    .email("Debe ser un email válido")
    .max(255)
    .trim()
    .toLowerCase(),
});

export const adminCodeVerifySchema = adminCodeRequestSchema.extend({
  code: z
    .string({ message: "El código es obligatorio" })
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
  rememberDevice: z.boolean().optional().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
