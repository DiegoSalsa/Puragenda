import { describe, expect, it } from "vitest";
import {
  clientPortalAccessEmail,
  newBookingClientEmail,
  withClientPortalAccess,
} from "@/server/email/templates";

describe("correo de acceso al portal del cliente", () => {
  it("explica el acceso sin contraseña y escapa el enlace", () => {
    const email = clientPortalAccessEmail({
      portalUrl: "https://example.com/verify?token=a&next=<portal>",
      expiresInMinutes: 15,
    });

    expect(email.subject).toContain("Mi agenda");
    expect(email.html).toContain("sin contraseña");
    expect(email.html).toContain("15 minutos");
    expect(email.html).toContain("token=a&amp;next=&lt;portal&gt;");
    expect(email.html).not.toContain("next=<portal>");
  });

  it("agrega el botón privado al correo operativo sin alterar su asunto", () => {
    const booking = newBookingClientEmail({
      customerName: "María",
      customerEmail: "maria@example.com",
      serviceName: "Corte",
      staffName: "Diego",
      startTime: new Date("2026-08-10T14:00:00.000Z"),
      endTime: new Date("2026-08-10T15:00:00.000Z"),
      businessName: "Estudio",
    });
    const decorated = withClientPortalAccess(
      booking,
      "https://www.puragenda.cl/mi-agenda/entrar/secret&value",
    );

    expect(decorated.subject).toBe(booking.subject);
    expect(decorated.html).toContain("Ver mis citas y premios");
    expect(decorated.html).toContain("válido por 30 días");
    expect(decorated.html).toContain("secret&amp;value");
  });
});
