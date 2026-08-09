import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { AvailabilityStoryImage } from "@/server/stories/availability-story-image";
import type {
  AvailabilityStoryData,
  AvailabilityStoryDay,
} from "@/server/services/availability-story.service";

const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lz5nWQAAAABJRU5ErkJggg==";

function buildStoryData(days: AvailabilityStoryDay[]): AvailabilityStoryData {
  return {
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
    locationAddress: "Av. Principal 123",
    staffName: "Camila",
    headline: "¡Tenemos horas disponibles!",
    template: "AURORA",
    objective: "FILL_SLOTS",
    backgroundMode: "ART",
    artIntensity: 0.38,
    fontStyle: "MODERN",
    logoFit: "CONTAIN",
    showSchedule: true,
    showServices: true,
    showProfessional: true,
    showLocationName: true,
    showAddress: false,
    days,
    bookingUrl: "https://www.puragenda.cl/widget/demo?utm_source=instagram",
    generatedAt: "2026-08-08T12:00:00.000Z",
    timezone: "America/Santiago",
    templateBackgroundUrl: pixel,
    ctaMode: "LINK_STICKER",
    callToAction: "Reserva desde el enlace de nuestra bio",
    disclaimer: "Cupos sujetos a disponibilidad en tiempo real",
    poweredBy: "Agenda online con Puragenda",
    noAvailability: "Sin cupos disponibles",
    serviceIds: ["service-1"],
    slotCount: days.reduce((total, day) => total + day.times.length, 0),
    potentialRevenue: 75_000,
  };
}

async function renderStory(data: AvailabilityStoryData) {
  const element = createElement(AvailabilityStoryImage, {
    productLogoUrl: pixel,
    data,
  });
  const response = new ImageResponse(element, { width: 1080, height: 1920 });
  return { response, png: await response.arrayBuffer() };
}

describe("availability story PNG", () => {
  it("renders a 1080x1920 detailed image response", async () => {
    const { response, png } = await renderStory(
      buildStoryData([
        {
          date: "2026-08-10",
          label: "lunes 10 de agosto",
          times: ["10:00", "11:00", "15:00"],
        },
      ]),
    );

    expect(response.headers.get("content-type")).toContain("image/png");
    expect(png.byteLength).toBeGreaterThan(1_000);
  });

  it("renders an entire month using the compact calendar layout", async () => {
    const days = Array.from({ length: 31 }, (_, index) => {
      const date = new Date(2026, 7, 1 + index, 12);
      const isoDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      return {
        date: isoDate,
        label: new Intl.DateTimeFormat("es-CL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(date),
        times: index % 6 === 0 ? [] : ["09:00", "11:00", "15:00", "17:00"],
      };
    });

    const { response, png } = await renderStory(buildStoryData(days));

    expect(response.headers.get("content-type")).toContain("image/png");
    expect(png.byteLength).toBeGreaterThan(10_000);
  }, 15_000);
});
