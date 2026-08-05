import { z } from "zod";

export const managedAppointmentSchema = z.object({
  customerName: z.string().trim().min(2, "Ingresa el nombre del cliente").max(100),
  customerEmail: z.string().trim().email("Ingresa un correo válido").max(255).toLowerCase(),
  customerPhone: z.string().trim().max(30).optional().default(""),
  clientId: z.string().trim().min(1).optional(),
  serviceId: z.string().trim().min(1, "Selecciona un servicio"),
  staffId: z.string().trim().min(1, "Selecciona un profesional"),
  selectedOptionAlternativeIds: z.array(z.string().trim().min(1)).max(30).default([]),
  startTime: z.string().datetime("La fecha y hora no son válidas"),
  internalNotes: z.string().trim().max(1000).optional().default(""),
  sendConfirmation: z.boolean().default(true),
});

export type ManagedAppointmentInput = z.infer<typeof managedAppointmentSchema>;
