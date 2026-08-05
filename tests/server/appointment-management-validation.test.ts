import { describe, expect, it } from "vitest";
import { managedAppointmentSchema } from "@/server/validations/appointment-management";

const valid = {
  customerName: "Camila Soto",
  customerEmail: "CAMILA@example.com",
  customerPhone: "+56 9 1234 5678",
  serviceId: "service_1",
  staffId: "staff_1",
  selectedOptionAlternativeIds: [],
  startTime: "2026-08-10T14:00:00.000Z",
  internalNotes: "",
  sendConfirmation: true,
};

describe("validación de agenda interna", () => {
  it("normaliza el correo y acepta una cita válida", () => {
    const result = managedAppointmentSchema.parse(valid);
    expect(result.customerEmail).toBe("camila@example.com");
  });

  it("rechaza datos sin servicio, profesional o correo válido", () => {
    const result = managedAppointmentSchema.safeParse({
      ...valid,
      customerEmail: "invalido",
      serviceId: "",
      staffId: "",
    });
    expect(result.success).toBe(false);
  });
});
