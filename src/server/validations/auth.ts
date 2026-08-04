import { z } from "zod";
import { isSupportedCountryCode, isValidTimeZone } from "@/core/countries";

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

  termsAccepted: z.literal(true, { error: "Debes aceptar los Términos de Servicio" }),
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
