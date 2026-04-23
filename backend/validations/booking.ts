import { z } from "zod";

export const bookingSchema = z.object({
  serviceId: z
    .string({ required_error: "El ID del servicio es obligatorio" })
    .min(1, "El ID del servicio no puede estar vacío"),

  customerName: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no debe exceder 100 caracteres")
    .trim(),

  customerEmail: z
    .string({ required_error: "El email es obligatorio" })
    .email("Debe ser un email válido (ej: nombre@dominio.com)")
    .max(255, "El email no debe exceder 255 caracteres")
    .trim()
    .toLowerCase(),

  startTime: z
    .string({ required_error: "La hora de inicio es obligatoria" })
    .datetime({ message: "startTime debe ser una fecha ISO 8601 válida" })
    .refine(
      (val) => new Date(val) > new Date(),
      { message: "La hora de inicio debe ser en el futuro" }
    ),

  endTime: z
    .string({ required_error: "La hora de fin es obligatoria" })
    .datetime({ message: "endTime debe ser una fecha ISO 8601 válida" }),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  }
);

export type BookingInput = z.infer<typeof bookingSchema>;

export const registerSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio" })
    .email("Debe ser un email válido")
    .max(255)
    .trim()
    .toLowerCase(),

  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña no debe exceder 128 caracteres"),

  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const serviceSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(1, "El nombre no puede estar vacío")
    .max(100)
    .trim(),

  description: z.string().max(500).optional().default(""),

  duration: z
    .number({ required_error: "La duración es obligatoria" })
    .int("La duración debe ser un número entero")
    .min(5, "La duración mínima es 5 minutos")
    .max(480, "La duración máxima es 480 minutos (8 horas)"),

  price: z
    .number({ required_error: "El precio es obligatorio" })
    .min(0, "El precio no puede ser negativo"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
