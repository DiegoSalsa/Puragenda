import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BellaProvider } from "@/websites/templates/bella/Context";
import Portfolio from "@/websites/templates/bella/_components/Portfolio";
import { fixtureView } from "@/websites/fixtures/views";
import { resolveBellaGallery } from "@/websites/templates/bella/gallery";
vi.mock("@/websites/templates/bella/Media", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }) }));

describe("Bella gallery rendering", () => {
  it("omits the entire Portfolio when no manual or service photos exist", () => {
    const view = fixtureView("c"); view.catalog.services = view.catalog.services.map(service => ({ ...service, image: "" }));
    view.config.gallery = resolveBellaGallery(view.config, view.catalog.services);
    expect(renderToStaticMarkup(React.createElement(BellaProvider, { view }, React.createElement(Portfolio)))).toBe("");
  });
  it("renders tenant C service photos without injecting any demo asset", () => {
    const view = fixtureView("c"); view.config.gallery = resolveBellaGallery(view.config, view.catalog.services);
    const html = renderToStaticMarkup(React.createElement(BellaProvider, { view }, React.createElement(Portfolio)));
    expect(html).toContain('id="trabajos"'); expect(html).toContain("website-qa-c/service.webp"); expect(html).not.toContain("/websites/bella/");
  });
  it("allows demo content only when an explicit fixture supplies it", () => {
    const view = fixtureView("a");
    expect(renderToStaticMarkup(React.createElement(BellaProvider, { view }, React.createElement(Portfolio)))).toContain("/websites/bella/portfolio/");
  });
});
