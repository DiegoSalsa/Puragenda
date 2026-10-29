import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEPOSIT_UNAVAILABLE_MESSAGE, selectedDepositUnavailable, type DepositPaymentStatus } from "@/core/booking-deposit";
import MatchdayBooking from "@/websites/templates/matchday/Booking";
import { Provider } from "@/websites/templates/matchday/Context";
import BellaBooking from "@/websites/templates/bella/_components/BookingFlow";
import { BellaProvider } from "@/websites/templates/bella/Context";
import RitualBooking from "@/websites/templates/ritual/Booking";
import { Provider as RitualProvider } from "@/websites/templates/ritual/Context";
import { ritualFixture } from "@/websites/fixtures/ritual";
import { emptyBellaConfig } from "@/websites/config";
import { matchdayFixture } from "@/websites/fixtures/matchday";
import { createWebsiteApi } from "@/websites/booking/client";
import type { Catalog } from "@/websites/booking/types";
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));

function fixture(price: number, amount: number, enabled: boolean, status: DepositPaymentStatus) {
  const view = matchdayFixture("soccerbarber");
  const catalog: Catalog = { ...view.catalog, mode: "connected", services: [{ ...view.catalog.services[0], optionCategories: [], price, depositAmount: amount, depositPaymentStatus: status }],
    rules: { ...view.catalog.rules!, depositEnabled: enabled, depositPaymentStatus: status, maxServicesPerBooking: 1 } };
  return { view, catalog };
}
describe("public deposit requirements remain visible independently of payment availability", () => {
  afterEach(() => vi.unstubAllGlobals());
  for (const template of ["matchday", "bella", "ritual"]) {
    it.each([
      [20000, 5000, true, "UNAVAILABLE", true], [0, 5000, true, "UNAVAILABLE", false],
      [20000, 0, true, "UNAVAILABLE", false], [20000, 5000, false, "UNAVAILABLE", false], [20000, 5000, true, "CHECK_AT_BOOKING", false],
    ] as const)(`${template}: price=%s deposit=%s enabled=%s status=%s`, (price, amount, enabled, status, unavailable) => {
      const { view, catalog } = fixture(price, amount, enabled, status);
      const props = { catalog, today: "2026-10-08", initialServiceId: catalog.services[0].id };
      const html = template === "ritual"
        ? renderToStaticMarkup(React.createElement(RitualProvider, { view: { ...ritualFixture("casa"), catalog, preview: false } } as React.ComponentProps<typeof RitualProvider>, React.createElement(RitualBooking, { ...props, copy: { steps: ["Servicio", "Profesional", "Horario", "Datos", "Confirmación"], title: "Reserva", note: "Fixture", action: "Reservar" } })))
        : template === "matchday"
        ? renderToStaticMarkup(React.createElement(Provider, { view: { ...view, catalog, preview: false } } as React.ComponentProps<typeof Provider>, React.createElement(MatchdayBooking, props)))
        : renderToStaticMarkup(React.createElement(BellaProvider, { view: { ...view, catalog, preview: false, config: emptyBellaConfig() } } as React.ComponentProps<typeof BellaProvider>, React.createElement(BellaBooking, props)));
      expect(html.includes(DEPOSIT_UNAVAILABLE_MESSAGE)).toBe(unavailable);
      expect(selectedDepositUnavailable(enabled, catalog.services, price)).toBe(unavailable);
      if (unavailable) { expect(html).toContain("Abono"); expect(html).toContain("5.000"); }
    });
  }
  it("treats the explicit 503 as a rejected booking, while other 503 responses remain uncertain", async () => {
    const { catalog } = fixture(20000, 5000, true, "UNAVAILABLE");
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ code: "DEPOSIT_UNAVAILABLE", error: DEPOSIT_UNAVAILABLE_MESSAGE }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: "Temporary failure" }, { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const api = createWebsiteApi(catalog, false);
    const data = { serviceId: catalog.services[0].id, optionIds: [], staffId: "fixture-staff", locationId: catalog.locations[0].id, date: "2026-10-08", startTime: "2026-10-08T13:00:00Z", customerName: "Fixture", customerEmail: "fixture@example.invalid", customerPhone: "+56911111111" };
    await expect(api.book(data, "fixture-operation")).rejects.toMatchObject({ code: "DEPOSIT_UNAVAILABLE", status: 503, message: DEPOSIT_UNAVAILABLE_MESSAGE });
    await expect(api.book(data, "fixture-operation")).rejects.toMatchObject({ code: "UNCERTAIN", status: 503 });
  });
});
