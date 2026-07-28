import { describe, expect, it } from "vitest";
import { confirmedBookingClientEmail } from "@/server/email/templates";

const baseData = {
  customerName: "Camila",
  customerEmail: "camila@example.com",
  serviceName: "Corte",
  staffName: "Diego",
  startTime: new Date("2026-08-10T14:00:00.000Z"),
  endTime: new Date("2026-08-10T15:00:00.000Z"),
  businessName: "Estudio",
};

describe("acciones en el correo de confirmación", () => {
  it("no muestra acciones cuando el negocio no las habilita", () => {
    const email = confirmedBookingClientEmail(baseData);

    expect(email.html).not.toContain("/cita/cancelar");
    expect(email.html).not.toContain("/reagendar/");
    expect(email.html).toContain("contacte directamente");
  });

  it("muestra cancelación y reagendamiento con advertencia de seguridad", () => {
    const email = confirmedBookingClientEmail({
      ...baseData,
      cancelUrl: "https://example.com/cita/cancelar?manageToken=secret",
      rescheduleUrl: "https://example.com/reagendar/apt?token=secret",
    });

    expect(email.html).toContain("Cancelar cita");
    expect(email.html).toContain("Reagendar cita");
    expect(email.html).toContain("confirmación adicional");
  });
});
