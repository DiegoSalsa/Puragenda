import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/email/resend", () => ({
  resend: { emails: { send: sendMock } },
  EMAIL_FROM: "Puragenda <qa@example.test>",
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: vi.fn(), findFirst: vi.fn(async () => ({ locale: "es" })) },
    clientPortalAccount: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("@/server/services/client-portal.service", () => ({
  getClientPortalAppUrl: () => "https://www.puragenda.cl",
  issueClientPortalEmailToken: vi.fn(async () => ({ token: "portal-token" })),
}));

vi.mock("@/server/services/customer-appointment-action.service", () => ({
  issueCustomerAppointmentToken: vi.fn(),
}));

vi.mock("@/server/email/templates", () => ({
  newBookingOwnerEmail: vi.fn(() => ({ subject: "Owner", html: "<p>Owner</p>" })),
  newBookingStaffEmail: vi.fn(() => ({ subject: "Staff", html: "<p>Staff</p>" })),
  newBookingClientEmail: vi.fn(() => ({ subject: "Client", html: "<p>Client</p>" })),
  withClientPortalAccess: vi.fn((template, portalUrl) => ({
    ...template,
    html: `${template.html}<a href="${portalUrl}">Mi agenda</a>`,
  })),
}));

import { sendBookingNotifications } from "@/server/email/send";

describe("booking notification delivery accounting", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("reports only provider-confirmed deliveries without blocking the booking", async () => {
    sendMock
      .mockResolvedValueOnce({ data: { id: "mail-owner" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "provider rejected" } })
      .mockResolvedValueOnce({ data: { id: "mail-client" }, error: null });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      sendBookingNotifications({
        id: "appointment-qa",
        customerName: "Cliente QA",
        customerEmail: "client@example.test",
        startTime: new Date("2026-08-03T18:00:00.000Z"),
        endTime: new Date("2026-08-03T19:00:00.000Z"),
        service: { name: "Servicio QA" },
        staff: { name: "Profesional QA", email: "staff@example.test" },
        business: {
          name: "Negocio QA",
          owner: { name: "Owner QA", email: "owner@example.test" },
        },
      }),
    ).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.objectContaining({
      html: expect.stringContaining("/mi-agenda/entrar/portal-token"),
    }));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Resend rejected"),
      expect.objectContaining({ message: "provider rejected" }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[Email] Booking notifications complete for appointment appointment-qa: 2/3 delivered",
    );

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
