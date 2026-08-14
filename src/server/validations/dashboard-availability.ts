import { z } from "zod";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es valida");

export const dashboardAvailabilityRequestSchema = z.object({
  mode: z.enum(["overview", "services"]).default("services"),
  locationId: z.string().trim().min(1, "Selecciona una sucursal"),
  serviceIds: z.array(z.string().trim().min(1)).max(10).default([]),
  staffId: z.string().trim().min(1).optional(),
  staffAssignments: z.array(z.object({
    serviceId: z.string().trim().min(1),
    staffId: z.string().trim().min(1),
  })).max(10).optional(),
  selectedOptionAlternativeIds: z.array(z.string().trim().min(1)).max(50).default([]),
  fromDate: dateKeySchema,
  days: z.number().int().min(1).max(30).default(7),
}).superRefine((value, context) => {
  if (value.mode === "services" && value.serviceIds.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["serviceIds"],
      message: "Selecciona al menos un servicio",
    });
  }

  if (value.staffId && value.staffAssignments?.length) {
    context.addIssue({
      code: "custom",
      path: ["staffAssignments"],
      message: "Selecciona un profesional comun o asigna uno por servicio, no ambos",
    });
  }

  if (new Set(value.serviceIds).size !== value.serviceIds.length) {
    context.addIssue({
      code: "custom",
      path: ["serviceIds"],
      message: "Los servicios seleccionados no pueden repetirse",
    });
  }
});

export type DashboardAvailabilityRequest = z.infer<typeof dashboardAvailabilityRequestSchema>;
