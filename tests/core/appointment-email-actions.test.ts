import { describe, expect, it } from "vitest";
import {
  confirmedBookingClientEmail,
  newBookingOwnerEmail,
} from "@/server/email/templates";

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

  it("incluye el teléfono del cliente como enlace de llamada", () => {
    const email = newBookingOwnerEmail({
      ...baseData,
      customerPhone: "+56 9 1234 5678",
    });

    expect(email.html).toContain("Teléfono del cliente");
    expect(email.html).toContain('href="tel:+56912345678"');
    expect(email.html).toContain("+56 9 1234 5678");
  });

  it("incluye un evento completo para Google Calendar", () => {
    const email = confirmedBookingClientEmail(baseData);

    expect(email.html).toContain("Agregar a Google Calendar");
    expect(email.html).toContain("https://calendar.google.com/calendar/render?");
    expect(email.html).toContain("dates=20260810T140000Z%2F20260810T150000Z");
  });
});
