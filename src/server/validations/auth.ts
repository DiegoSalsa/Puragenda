import { z } from "zod";

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
