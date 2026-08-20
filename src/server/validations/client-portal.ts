import { z } from "zod";

export const clientPortalEmailSchema = z.string().trim().email("Ingresa un correo válido").max(254).toLowerCase();

export const clientPortalPasswordSchema = z.string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(128, "La contraseña no puede superar 128 caracteres")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "La contraseña debe incluir una letra")
  .regex(/\d/, "La contraseña debe incluir un número");

export const clientPortalPhoneSchema = z.string()
  .trim()
  .regex(/^\+?[0-9\s()-]{8,18}$/, "Ingresa un teléfono válido");

const clientPortalRutSchema = z.string().trim().max(20, "El RUT no puede superar 20 caracteres").optional().default("");
const clientPortalAddressSchema = z.string().trim().max(300, "La dirección no puede superar 300 caracteres").optional().default("");

export const clientPortalRegisterSchema = z.object({
  email: clientPortalEmailSchema,
  password: clientPortalPasswordSchema,
  name: z.string().trim().min(2, "Ingresa tu nombre").max(100),
  phone: clientPortalPhoneSchema,
  rut: clientPortalRutSchema,
  defaultAddress: clientPortalAddressSchema,
});

export const clientPortalLoginSchema = z.object({
  email: clientPortalEmailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(128),
});

export const clientPortalResetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: clientPortalPasswordSchema,
});

export const clientPortalProfileSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(100),
  phone: clientPortalPhoneSchema,
  rut: clientPortalRutSchema,
  defaultAddress: clientPortalAddressSchema,
});

export const clientPortalChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual").max(128),
  newPassword: clientPortalPasswordSchema,
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "La contraseña nueva debe ser diferente",
  path: ["newPassword"],
});

export function safeClientPortalReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !value.startsWith("/")) return null;
  try {
    const base = "https://puragenda.local";
    const parsed = new URL(value, base);
    if (parsed.origin !== base || !/^\/widget\/[^/]+\/?$/.test(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
