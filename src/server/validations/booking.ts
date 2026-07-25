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

  isHomeService: z.coerce.boolean().optional().default(false),
});

export const optionCategorySchema = z.object({
  name: z
    .string({ message: "El nombre de la categoria es obligatorio" })
    .min(1, "El nombre de la categoria no puede estar vacio")
    .max(80)
    .trim(),

  isRequired: z.coerce.boolean().default(false),

  maxSelections: z.coerce
    .number({ message: "El maximo de selecciones debe ser numerico" })
    .int("El maximo de selecciones debe ser un numero entero")
    .min(1, "Debe permitirse al menos una seleccion")
    .max(20, "No se pueden permitir mas de 20 selecciones")
    .default(1),

  alternatives: z
    .array(optionAlternativeSchema)
    .min(1, "Cada categoria debe tener al menos una alternativa")
    .max(20, "Cada categoria puede tener hasta 20 alternativas"),
}).refine((category) => category.maxSelections <= category.alternatives.length, {
  message: "El maximo de selecciones no puede superar la cantidad de alternativas",
  path: ["maxSelections"],
});

export const serviceCategoryNameSchema = z
  .string({ message: "El nombre de la categoría es obligatorio" })
  .trim()
  .min(1, "El nombre de la categoría no puede estar vacío")
  .max(80, "El nombre de la categoría no puede superar 80 caracteres");

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

    customerAddress: z
      .string()
      .trim()
      .max(300, "La direccion no debe exceder 300 caracteres")
      .optional(),

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

export const customProductionWindowSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(2, "Escribe un nombre para el período").max(100),
  startDate: z.string().date("La fecha inicial no es válida"),
  endDate: z.string().date("La fecha final no es válida"),
  capacity: z.coerce
    .number()
    .int("La capacidad debe ser un número entero")
    .min(1, "Debe existir al menos 1 cupo")
    .max(10000, "La capacidad máxima es 10.000"),
  isActive: z.coerce.boolean().optional().default(true),
}).refine((window) => window.endDate >= window.startDate, {
  message: "La fecha final debe ser igual o posterior a la inicial",
  path: ["endDate"],
});

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

  categoryId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().min(1).nullable().optional()
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

  bookingMode: z.enum(["APPOINTMENT", "PRODUCTION"]).optional().default("APPOINTMENT"),

  productionScheduleMode: z.enum(["WEEKLY", "CUSTOM"]).optional().default("WEEKLY"),

  weeklyProductionCapacity: z.coerce
    .number()
    .int("Los cupos semanales deben ser un numero entero")
    .min(1, "Debe existir al menos 1 cupo semanal")
    .max(100, "El maximo es 100 cupos semanales")
    .optional()
    .default(5),

  productionWeeksAhead: z.coerce
    .number()
    .int("Las semanas disponibles deben ser un numero entero")
    .min(1, "Debes abrir al menos 1 semana")
    .max(104, "Puedes abrir hasta 104 semanas")
    .optional()
    .default(24),

  productionLeadTimeWeeks: z.coerce
    .number()
    .int("La anticipación debe ser un número entero")
    .min(0, "La anticipación no puede ser negativa")
    .max(104, "La anticipación máxima es 104 semanas")
    .optional()
    .default(1),

  customProductionWindows: z
    .array(customProductionWindowSchema)
    .max(60, "Puedes configurar hasta 60 períodos")
    .optional()
    .default([]),

  productionDepositPercent: z.coerce
    .number()
    .int("El porcentaje de abono debe ser un numero entero")
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede superar 100")
    .optional()
    .default(50),

  requiresReferenceImages: z.coerce.boolean().optional().default(false),

  optionCategories: z
    .array(optionCategorySchema)
    .max(10, "Cada servicio puede tener hasta 10 categorias de opciones")
    .optional()
    .default([]),
}).superRefine((service, ctx) => {
  if (service.bookingMode !== "PRODUCTION" || service.productionScheduleMode !== "CUSTOM") return;

  const activeWindows = service.customProductionWindows.filter((window) => window.isActive);
  if (activeWindows.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Agrega al menos un período de entrega activo",
      path: ["customProductionWindows"],
    });
  }

  const keys = new Set<string>();
  service.customProductionWindows.forEach((window, index) => {
    if (keys.has(window.key)) {
      ctx.addIssue({
        code: "custom",
        message: "Cada período debe tener un identificador único",
        path: ["customProductionWindows", index, "key"],
      });
    }
    keys.add(window.key);
  });
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const productionOrderSchema = z.object({
  serviceId: z.string().min(1),
  selectedOptionAlternativeIds: z.array(z.string()).max(50).optional().default([]),
  productionWeek: z.string().date("La semana de produccion no es valida"),
  productionWindowKey: z.string().trim().min(1).max(80),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email().max(255).toLowerCase(),
  customerPhone: z.string().trim().regex(/^\+?[0-9\s()-]{8,18}$/, "Telefono invalido"),
  petName: z.string().trim().min(1, "Indica el nombre de la mascota").max(80),
  petDetails: z.string().trim().min(10, "Cuéntanos un poco mas sobre la mascota").max(2000),
  referenceImageUrls: z.array(z.string().url()).max(6).optional().default([]),
  deliveryMethod: z.enum(["COORDINATE", "PICKUP", "SHIPPING"]).optional().default("COORDINATE"),
  customerAddress: z.string().trim().max(300).optional(),
}).superRefine((data, ctx) => {
  if (data.deliveryMethod === "SHIPPING" && (!data.customerAddress || data.customerAddress.length < 5)) {
    ctx.addIssue({
      code: "custom",
      message: "Indica la direccion de despacho",
      path: ["customerAddress"],
    });
  }
});

export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;
