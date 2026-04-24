import { z } from "zod";

export const bookingSchema = z
  .object({
    serviceId: z
      .string({ message: "El ID del servicio es obligatorio" })
      .min(1, "El ID del servicio no puede estar vacío"),

    staffId: z.string().optional(),

    customerName: z
      .string({ message: "El nombre es obligatorio" })
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no debe exceder 100 caracteres")
      .trim(),

    customerEmail: z
      .string({ message: "El email es obligatorio" })
      .email("Debe ser un email válido (ej: nombre@dominio.com)")
      .max(255, "El email no debe exceder 255 caracteres")
      .trim()
      .toLowerCase(),

    customerPhone: z
      .string()
      .regex(/^\+?[0-9\s()-]{8,18}$/, "Teléfono inválido")
      .optional(),

    startTime: z
      .string({ message: "La hora de inicio es obligatoria" })
      .datetime({ message: "startTime debe ser una fecha ISO 8601 válida" }),

    endTime: z
      .string({ message: "La hora de fin es obligatoria" })
      .datetime({ message: "endTime debe ser una fecha ISO 8601 válida" }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const serviceSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio" })
    .min(1, "El nombre no puede estar vacío")
    .max(100)
    .trim(),

  description: z.string().max(500).optional().default(""),

  duration: z
    .number({ message: "La duración es obligatoria" })
    .int("La duración debe ser un número entero")
    .min(5, "La duración mínima es 5 minutos")
    .max(480, "La duración máxima es 480 minutos (8 horas)"),

  price: z
    .number({ message: "El precio es obligatorio" })
    .min(0, "El precio no puede ser negativo"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
