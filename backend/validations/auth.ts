import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio" })
    .email("Debe ser un email valido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ required_error: "La contrasena es obligatoria" })
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(128, "La contrasena no debe exceder 128 caracteres"),

  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio" })
    .email("Debe ser un email valido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ required_error: "La contrasena es obligatoria" })
    .min(1, "La contrasena es obligatoria")
    .max(128, "La contrasena no debe exceder 128 caracteres"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
