import { z } from "zod";

export const optionAlternativeSchema = z.object({
  name: z
    .string({ message: "El nombre de la alternativa es obligatorio" })
    .min(1, "El nombre de la alternativa no puede estar vacio")
    .max(80)
    .trim(),

  priceDelta: z.coerce
    .number({ message: "El ajuste de precio debe ser numerico" })
    .min(0, "El ajuste de precio no puede ser negativo")
    .default(0),

  durationDelta: z.coerce
    .number({ message: "El ajuste de duracion debe ser numerico" })
    .int("El ajuste de duracion debe ser un numero entero")
    .min(0, "El ajuste de duracion no puede ser negativo")
    .max(480, "El ajuste maximo de duracion es 480 minutos")
    .default(0),
});

export const optionCategorySchema = z.object({
  name: z
    .string({ message: "El nombre de la categoria es obligatorio" })
    .min(1, "El nombre de la categoria no puede estar vacio")
    .max(80)
    .trim(),

  isRequired: z.coerce.boolean().default(false),

  alternatives: z
    .array(optionAlternativeSchema)
    .min(1, "Cada categoria debe tener al menos una alternativa")
    .max(20, "Cada categoria puede tener hasta 20 alternativas"),
});

export const bookingSchema = z
  .object({
    serviceId: z
      .string({ message: "El ID del servicio es obligatorio" })
      .min(1, "El ID del servicio no puede estar vacio"),

    serviceIds: z.array(z.string()).optional(),

    selectedOptionAlternativeIds: z.array(z.string()).optional().default([]),

    staffId: z.string().optional(),

    staffAssignments: z
      .array(z.object({
        serviceId: z.string().min(1, "El servicio de la asignacion es obligatorio"),
        staffId: z.string().min(1, "El profesional de la asignacion es obligatorio"),
      }))
      .optional(),

    rewardCode: z.string().optional(),

    customerName: z
      .string({ message: "El nombre es obligatorio" })
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no debe exceder 100 caracteres")
      .trim(),

    customerEmail: z
      .string({ message: "El email es obligatorio" })
      .email("Debe ser un email valido (ej: nombre@dominio.com)")
      .max(255, "El email no debe exceder 255 caracteres")
      .trim()
      .toLowerCase(),

    customerPhone: z
      .string({ message: "El telefono es obligatorio" })
      .trim()
      .min(1, "El telefono es obligatorio")
      .regex(/^\+?[0-9\s()-]{8,18}$/, "Telefono invalido"),

    startTime: z
      .string({ message: "La hora de inicio es obligatoria" })
      .datetime({ message: "startTime debe ser una fecha ISO 8601 valida" }),

    endTime: z
      .string({ message: "La hora de fin es obligatoria" })
      .datetime({ message: "endTime debe ser una fecha ISO 8601 valida" }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const serviceSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio" })
    .min(1, "El nombre no puede estar vacio")
    .max(100)
    .trim(),

  description: z.string().max(500).optional().default(""),

  imageUrl: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .url("La URL de la imagen no es valida")
      .nullable()
      .optional()
  ),

  duration: z.coerce
    .number({ message: "La duracion es obligatoria" })
    .int("La duracion debe ser un numero entero")
    .min(5, "La duracion minima es 5 minutos")
    .max(480, "La duracion maxima es 480 minutos (8 horas)"),

  price: z.coerce
    .number({ message: "El precio es obligatorio" })
    .min(0, "El precio no puede ser negativo"),

  depositAmount: z.coerce
    .number()
    .int("El monto de abono debe ser un numero entero")
    .min(0, "El monto de abono no puede ser negativo")
    .optional()
    .default(0),

  optionCategories: z
    .array(optionCategorySchema)
    .max(10, "Cada servicio puede tener hasta 10 categorias de opciones")
    .optional()
    .default([]),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
