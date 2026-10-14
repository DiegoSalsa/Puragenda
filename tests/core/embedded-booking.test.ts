import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import BookingFlow from "@/websites/templates/bella/_components/BookingFlow";
import CategoryServicePicker, { serviceMatchesSearch } from "@/websites/templates/bella/_components/CategoryServicePicker";
import { BellaProvider } from "@/websites/templates/bella/Context";
import { fixtureView } from "@/websites/fixtures/views";

vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));

describe("embedded booking with native categories", () => {
  it("finds native service names despite repeated spaces and omitted accents", () => {
    expect(serviceMatchesSearch("Kapping  diseño simple", " kapping diseno simple ")).toBe(true);
    expect(serviceMatchesSearch("Lifting coreano", "kapping")).toBe(false);
  });
  const renderFlow = (presentation: "default" | "embedded") => {
    const view = fixtureView("a");
    const base = view.catalog.services[0];
    view.catalog.locations.push({ id: "second-location", name: "Otra sede", timezone: "America/Santiago" });
    view.catalog.services = [
      { ...base, id: "late", categoryId: "late", category: "Pestañas", categoryPosition: 1 },
      { ...base, id: "first", categoryId: "first", category: "Uñas", categoryPosition: 0 },
      { ...base, id: "other-location", categoryId: "other", category: "Solo otra sede", locationIds: ["second-location"], categoryPosition: 0 },
    ];
    return renderToStaticMarkup(React.createElement(BellaProvider, { view }, React.createElement(BookingFlow, { catalog: view.catalog, today: "2026-10-08", presentation })));
  };
  it("uses category order and only the current location's catalog", () => {
    const html = renderFlow("embedded");
    expect(html.indexOf("<strong>Uñas</strong>")).toBeLessThan(html.indexOf("<strong>Pestañas</strong>"));
    expect(html).not.toContain("Solo otra sede");
    expect(html).toContain("Primero, elige una categoría");
  });
  it("preserves the accordion presentation for other templates", () => {
    const html = renderFlow("default");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Primero, elige una categoría");
  });
  it("returns to the selected category without exposing services from other categories", () => {
    const base = fixtureView("a").catalog.services[0];
    const html = renderToStaticMarkup(React.createElement(CategoryServicePicker, {
      groups: [
        { id: "nails", name: "Uñas", services: [{ ...base, id: "nail", name: "Manicura seleccionada" }] },
        { id: "lashes", name: "Pestañas", services: [{ ...base, id: "lash", name: "Lifting oculto" }] },
      ], selectedIds: ["nail"], maxServices: 1, currency: "CLP", onSelect: () => {},
    }));
    expect(html).toContain("Cambiar categoría");
    expect(html).toContain("Manicura seleccionada");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Lifting oculto");
  });
  it("blocks extra services at the booking limit while keeping the selected service removable", () => {
    const base = fixtureView("a").catalog.services[0];
    const html = renderToStaticMarkup(React.createElement(CategoryServicePicker, {
      groups: [{ id: "nails", name: "Uñas", services: [{ ...base, id: "one" }, { ...base, id: "two" }, { ...base, id: "three" }] }],
      selectedIds: ["one", "two"], maxServices: 2, currency: "CLP", onSelect: () => {},
    }));
    expect(html.match(/ disabled=""/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });
});
