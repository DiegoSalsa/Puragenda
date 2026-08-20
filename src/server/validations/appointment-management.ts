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

export const appointmentSettlementSchema = z.object({
  baseAmount: z.coerce.number().min(0, "El importe base no puede ser negativo").max(100_000_000),
  tipAmount: z.coerce.number().min(0, "La propina no puede ser negativa").max(100_000_000).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]).nullable().optional(),
  items: z.array(z.object({
    description: z.string().trim().min(1, "Describe el servicio o extra").max(100),
    amount: z.coerce.number().min(0, "El importe no puede ser negativo").max(100_000_000),
  })).max(20, "Puedes añadir hasta 20 extras").default([]),
});
