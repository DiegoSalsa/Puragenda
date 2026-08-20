import { z } from "zod";

export const clientPortalEmailSchema = z.string().trim().email("Ingresa un correo válido").max(254).toLowerCase();

export const clientPortalPasswordSchema = z.string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(128, "La contraseña no puede superar 128 caracteres")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "La contraseña debe incluir una letra")
  .regex(/\d/, "La contraseña debe incluir un número");

export const clientPortalRegisterSchema = z.object({
  email: clientPortalEmailSchema,
  password: clientPortalPasswordSchema,
  name: z.string().trim().min(2, "Ingresa tu nombre").max(100),
  phone: z.string().trim().max(30).optional().default(""),
  defaultAddress: z.string().trim().max(300).optional().default(""),
});

export const clientPortalLoginSchema = z.object({
  email: clientPortalEmailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(128),
});

export const clientPortalResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: clientPortalPasswordSchema,
});
