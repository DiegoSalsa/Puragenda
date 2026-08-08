import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { AvailabilityStoryImage } from "@/server/stories/availability-story-image";

describe("availability story PNG", () => {
  it("renders a 1080x1920 image response", async () => {
    const element = createElement(AvailabilityStoryImage, {
      data: {
        businessName: "Salón Demo",
        logoUrl: null,
        showLogo: true,
        primaryColor: "#7C3AED",
        secondaryColor: "#5B21B6",
        backgroundColor: "#111827",
        textColor: "#FFFFFF",
        serviceName: "Corte de cabello",
        serviceNames: ["Corte de cabello", "Coloración"],
        locationName: "Local principal",
        staffName: "Camila",
        headline: "¡Tenemos horas disponibles!",
        template: "AURORA" as const,
        backgroundMode: "ART" as const,
        days: [{ date: "2026-08-10", label: "lunes 10 de agosto", times: ["10:00", "11:00", "15:00"] }],
        bookingUrl: "https://www.puragenda.cl/widget/demo?utm_source=instagram",
        generatedAt: "2026-08-08T12:00:00.000Z",
        timezone: "America/Santiago",
        templateBackgroundUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lz5nWQAAAABJRU5ErkJggg==",
        callToAction: "Reserva desde el enlace de nuestra bio",
        disclaimer: "Cupos sujetos a disponibilidad en tiempo real",
        poweredBy: "Agenda online con Puragenda",
        noAvailability: "Sin cupos disponibles",
      },
    });
    const response = new ImageResponse(element, { width: 1080, height: 1920 });
    const png = await response.arrayBuffer();

    expect(response.headers.get("content-type")).toContain("image/png");
    expect(png.byteLength).toBeGreaterThan(1_000);
  });
});
