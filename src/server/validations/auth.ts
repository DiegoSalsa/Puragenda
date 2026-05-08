import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string({ message: "El email es obligatorio" })
    .email("Debe ser un email vÃƒÂ¡lido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ message: "La contraseÃƒÂ±a es obligatoria" })
    .min(8, "La contraseÃƒÂ±a debe tener al menos 8 caracteres")
    .max(128, "La contraseÃƒÂ±a no debe exceder 128 caracteres"),

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

  referralCode: z
    .string()
    .max(20)
    .trim()
    .toUpperCase()
    .optional()
    .nullable(),

  planIntent: z
    .enum(["INDIVIDUAL", "EQUIPO", "TEST"])
    .optional()
    .nullable(),

  termsAccepted: z.literal(true, { error: "Debes aceptar los Términos de Servicio" }),
});

export const loginSchema = z.object({
  email: z
    .string({ message: "El email es obligatorio" })
    .email("Debe ser un email vÃƒÂ¡lido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ message: "La contraseÃƒÂ±a es obligatoria" })
    .min(1, "La contraseÃƒÂ±a es obligatoria")
    .max(128, "La contraseÃƒÂ±a no debe exceder 128 caracteres"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
