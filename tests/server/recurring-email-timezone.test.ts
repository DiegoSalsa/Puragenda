import { describe, expect, it } from "vitest";
import { recurringBookingCreatedClientEmail } from "@/server/email/templates";

describe("recurring email date-only boundaries", () => {
  it("does not shift an Argentine plan period to the previous day", () => {
    const result = recurringBookingCreatedClientEmail({
      customerEmail: "client@example.test",
      customerName: "Cliente QA",
      serviceName: "Servicio QA",
      selectedDays: [1],
      selectedTimes: { "1": "10:00" },
      startDate: new Date("2026-08-10T00:00:00.000Z"),
      endDate: new Date("2026-09-09T00:00:00.000Z"),
      durationMonths: 1,
      conflicts: [],
      managementToken: "qa-token",
      businessName: "Agenda Argentina QA",
      timezone: "America/Argentina/Buenos_Aires",
    });

    expect(result.html).toContain("10 de agosto de 2026");
    expect(result.html).toContain("9 de septiembre de 2026");
    expect(result.html).toContain(">10:00<");
    expect(result.html).toContain("Todos los horarios corresponden a America/Argentina/Buenos_Aires.");
    expect(result.html).not.toContain("9 de agosto de 2026");
  });
});
