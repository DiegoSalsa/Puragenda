import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { bellaConfigSchema, emptyBellaConfig } from "@/websites/config";
import { bellaDisplayConfig } from "@/websites/templates/bella/display-config";
import { editableProcess } from "@/websites/templates/bella/process";
import { BellaProvider } from "@/websites/templates/bella/Context";
import Portfolio from "@/websites/templates/bella/_components/Portfolio";
import Studio from "@/websites/templates/bella/_components/Studio";
import ProcessPanel from "@/app/dashboard/website/process-panel";
import { fixtureView } from "@/websites/fixtures/views";
import { matchdayGallery } from "@/websites/templates/matchday/gallery";
import { parsePreviewMessage, PREVIEW_PROTOCOL } from "@/websites/preview-protocol";
vi.mock("@/websites/templates/bella/Media", () => ({ default: ({ src, alt }: { src: string; alt: string }) => React.createElement("span", { "data-image": src }, alt) }));
vi.mock("@/app/dashboard/website/media-picker", () => ({ default: ({ label }: { label: string }) => React.createElement("button", null, label) }));

describe("empty website media", () => {
  it("shows gallery and three process positions in a private preview without mutating the stored config", () => {
    const view = fixtureView("c");
    view.config = emptyBellaConfig();
    view.catalog.services = view.catalog.services.map(service => ({ ...service, image: "" }));
    const displayed = bellaDisplayConfig(view.config, view.catalog.services, true);
    const html = renderToStaticMarkup(React.createElement(BellaProvider, { view: { ...view, config: displayed, preview: true } }, React.createElement(Portfolio), React.createElement(Studio)));
    expect(html).toContain('id="trabajos"'); expect(html).toContain('id="estudio"');
    expect(html).toContain("Momento 3"); expect(html).not.toContain("/websites/bella/");
    expect(view.config.gallery).toEqual([]); expect(view.config.process).toEqual([]);
    const publicConfig = bellaDisplayConfig(view.config, view.catalog.services, false);
    expect(publicConfig.gallery).toEqual([]); expect(publicConfig.process).toEqual([]);
  });
  it("renders all three upload controls on an empty draft", () => {
    const html = renderToStaticMarkup(React.createElement(ProcessPanel, { config: emptyBellaConfig(), update: vi.fn(), onBusy: vi.fn(), onFocus: vi.fn(), onLocalPreview: vi.fn() }));
    for (const position of [1, 2, 3]) expect(html).toContain(`Foto del momento ${position}`);
  });
  it("saves the first carousel image while remaining positions are empty and accepts a local upload preview", () => {
    const config = emptyBellaConfig(); config.process = editableProcess(config.process);
    config.process[0].image = "/tenant/first.webp";
    expect(bellaConfigSchema.parse(config).process[0].image).toBe("/tenant/first.webp");
    expect(bellaDisplayConfig(config, [], false).process).toHaveLength(1);
    config.process[2].image = "blob:http://localhost:3005/upload";
    expect(parsePreviewMessage({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config }, "http://localhost:3005").success).toBe(true);
    expect(bellaConfigSchema.safeParse(config).success).toBe(false);
  });
  it("preserves tenant photos and supplies empty positions for Matchday only in preview", () => {
    const view = fixtureView("a");
    expect(bellaDisplayConfig(view.config, view.catalog.services, true).gallery).toEqual(view.config.gallery);
    expect(bellaDisplayConfig(view.config, view.catalog.services, true).process).toEqual(view.config.process);
    view.catalog.services = view.catalog.services.map(service => ({ ...service, image: "" }));
    expect(matchdayGallery({ gallery: [] }, view.catalog)).toEqual([]);
    expect(matchdayGallery({ gallery: [] }, view.catalog, true)).toHaveLength(3);
  });
});
