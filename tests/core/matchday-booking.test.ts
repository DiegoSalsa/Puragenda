import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Booking from "@/websites/templates/matchday/Booking";
import { Provider } from "@/websites/templates/matchday/Context";
import { matchdayFixture } from "@/websites/fixtures/matchday";

vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));
const render = (view: ReturnType<typeof matchdayFixture>, serviceId = view.catalog.services[0].id) => renderToStaticMarkup(React.createElement(Provider, { view } as React.ComponentProps<typeof Provider>, React.createElement(Booking, { catalog: view.catalog, today: "2026-10-08", initialServiceId: serviceId })));

describe("Matchday requires an explicit professional", () => {
  it("offers eligible barbers even when the API supports automatic assignment, without the first-available choice", () => {
    const view = matchdayFixture("soccerbarber");
    expect(view.catalog.supportsAnyStaff).toBe(true);
    const html = render(view);
    for (const person of view.catalog.staff) expect(html).toContain(person.name);
    expect(html).not.toContain("Primera disponible");
    expect(html).not.toContain("El primer horario disponible");
    expect(html).not.toContain("Elegir día y hora");
  });
  it("only offers barbers assigned to the selected service", () => {
    const view = matchdayFixture("soccerbarber");
    const html = render(view, view.catalog.services[1].id);
    expect(html).toContain("Matías");
    expect(html).toContain("Cristóbal");
    expect(html).not.toContain("Benjamín");
    expect(html).not.toContain("Primera disponible");
  });
  it("does not manufacture automatic assignment when no barber is eligible", () => {
    const view = matchdayFixture("soccerbarber");
    view.catalog.staff = [];
    const html = render(view);
    expect(html).toContain("No hay profesionales disponibles para este servicio.");
    expect(html).not.toContain("Primera disponible");
  });
});
