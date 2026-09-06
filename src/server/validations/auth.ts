import { z } from "zod";
import { isSupportedCountryCode, isValidTimeZone } from "@/core/countries";
import { registrationMarketplaceShapeErrors } from "@/lib/marketplace/onboarding";

export const registerSchema = z.object({
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

  countryCode: z
    .string()
    .default("CL")
    .transform((value) => value.trim().toUpperCase())
    .refine(isSupportedCountryCode, "Selecciona un país válido"),

  timezone: z
    .string()
    .trim()
    .refine(isValidTimeZone, "Selecciona una zona horaria válida")
    .optional(),

  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Usa un código de moneda ISO de 3 letras")
    .optional(),

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
    .enum(["INDIVIDUAL", "EQUIPO", "TEST"])
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
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
