import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { pinkPrototypeAllowed } from "@/websites/templates/pink-y2k/access";
import { emptyPinkConfig, pinkConfigSchema, pinkPatternColor, pinkPublicationError, PINK_STYLE_PRESETS } from "@/websites/templates/pink-y2k/config";
import { parsePinkPreview } from "@/websites/templates/pink-y2k/preview";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { resolveTemplate } from "@/websites/registry";
import { templateSwitchDraft } from "@/websites/template-snapshots";
import { fixtureView } from "@/websites/fixtures/views";
import { pinkFixtureView } from "@/websites/fixtures/pink-y2k";
import { contrastRatio } from "@/websites/palettes";
import { createWebsiteApi } from "@/websites/booking/client";
import { addDays, dateKey } from "@/websites/booking/validation";
import { quoteBookingSelection } from "@/core/booking-selection";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
import PinkY2k from "@/websites/templates/pink-y2k/PinkY2k";
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

describe("local pink prototype boundary", () => {
  it("requires explicit opt-in on a loopback development host", () => {
    for (const host of ["localhost:3007", "127.0.0.1:3007", "[::1]:3007"])
      expect(pinkPrototypeAllowed("development", "1", host)).toBe(true);
    for (const [environment, flag, host] of [
      ["production", "1", "localhost:3007"],
      ["test", "1", "localhost:3007"],
      ["development", "0", "localhost:3007"],
      ["development", "1", "bella-a.localhost:3007"],
      ["development", "1", "www.puragenda.cl"],
      ["development", "1", "localhost.evil.test"],
      ["development", "1", null],
    ])
      expect(
        pinkPrototypeAllowed(environment ?? undefined, flag ?? undefined, host),
      ).toBe(false);
  });
  it("does not expose the prototype on another tenant host", () => {
    vi.stubEnv("WEBSITE_ROOT_DOMAIN", "localhost");
    expect(
      proxy(
        new NextRequest("http://localhost:3007/website-preview/pink-y2k", {
          headers: { host: "bella-a.localhost:3007" },
        }),
      ).status,
    ).toBe(404);
    vi.unstubAllEnvs();
  });
});
describe("pink configuration and shared contracts", () => {
  it("keeps fixtures isolated between calls", () => {
    const first = pinkFixtureView(),
      second = pinkFixtureView();
    first.config.gallery.splice(0);
    first.catalog.services[0].name = "Edited";
    expect(second.config.gallery).toHaveLength(4);
    expect(second.catalog.services[0].name).toBe("Soft gel + diseño");
    expect(second.catalog.mode).toBe("demo");
    expect(second.business.id).toBe("fixture-pink-y2k");
  });
  it("validates imported media, links, limits and colors", () => {
    const config = pinkFixtureView().config;
    for (const input of [
      { ...config, heroImage: "javascript:alert(1)" },
      { ...config, logo: "https://evil.test/a.png" },
      { ...config, instagram: "javascript:alert(1)" },
      { ...config, colors: { ...config.colors, accent: "red" } },
      { ...config, pocket: { ...config.pocket, messages: [] } },
      {
        ...config,
        gallery: Array.from({ length: 31 }, () => config.gallery[0]),
      },
    ])
      expect(pinkConfigSchema.safeParse(input).success).toBe(false);
    expect(pinkConfigSchema.safeParse(config).success).toBe(true);
  });
  it("meets body and button contrast in the initial palette", () => {
    const c = pinkFixtureView().config.colors;
    expect(contrastRatio(c.ink, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.ink, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#ffffff", c.accent)).toBeGreaterThanOrEqual(4.5);
  });
  it("uses canonical quoting for design and removal options", () => {
    const service = pinkFixtureView().catalog.services[0];
    const quote = quoteBookingSelection(
      [service],
      ["pink-design-complex", "pink-removal-new"],
    );
    expect(quote.price).toBe(30990);
    expect(quote.duration).toBe(125);
    expect(quote.requiresAddress).toBe(false);
  });
  it("never calls an API to create a preview booking", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const catalog = pinkFixtureView().catalog;
    const api = createWebsiteApi(catalog, true, true);
    await expect(api.book({} as never, "fixture-key")).rejects.toThrow(
      "La vista previa no crea reservas",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it("returns demo slots through the existing fixture provider", async () => {
    const catalog = pinkFixtureView().catalog;
    const today = dateKey(new Date(), catalog.business.timezone);
    const api = createWebsiteApi(catalog, true, true);
    const result = await api.availability({
      date: addDays(today, 1),
      serviceId: catalog.services[0].id,
      serviceIds: [catalog.services[0].id],
      optionIds: ["pink-design-base"],
      staffId: catalog.staff[0].id,
      locationId: catalog.locations[0].id,
    });
    expect(result.mode).toBe("demo");
  });
});
describe("pink renderer isolation and empty states", () => {
  const render = (view: ReturnType<typeof pinkFixtureView>) =>
    renderToStaticMarkup(
      React.createElement(PinkY2k, { view, today: "2026-10-08" }),
    );
  it("renders only the supplied catalog and business branding", () => {
    const view = pinkFixtureView();
    view.config.displayName = "Otro estudio";
    view.catalog.services = [
      { ...view.catalog.services[0], name: "Servicio exclusivo tenant B", category: "Categoría exclusiva tenant B", categoryId: "tenant-b" },
    ];
    const html = render(view);
    expect(html).toContain("Otro estudio");
    expect(html).toContain("Categoría exclusiva tenant B");
    expect(html).not.toContain("Servicio exclusivo tenant B");
    expect(html).not.toContain("Kapping unicolor");
    expect(html).not.toContain("Instagram de Y2K");
  });
  it("starts a large catalog with categories inside the page instead of a second booking screen", () => {
    const view = pinkFixtureView();
    view.catalog.services = Array.from({ length: 24 }, (_, index) => ({
      ...view.catalog.services[0], id: `service-${index}`, name: `Tratamiento ${index}`,
      category: index < 20 ? "Uñas" : "Pestañas", categoryId: index < 20 ? "unas" : "pestanas", categoryPosition: index < 20 ? 0 : 1,
    }));
    const html = render(view);
    expect(html).toContain('aria-label="Reserva tu hora"');
    expect(html).toContain('data-booking-presentation="embedded"');
    expect(html).toContain("Primero, elige una categoría");
    expect(html).toContain("Uñas");
    expect(html).toContain("Pestañas");
    expect(html).toContain("20 servicios");
    expect(html).toContain("4 servicios");
    expect(html).not.toContain("Tratamiento 0");
    expect(html).not.toContain('role="dialog"');
  });
  it("handles an empty catalog and empty album without injecting fallback fixtures", () => {
    const view = pinkFixtureView();
    view.catalog.services = [];
    view.config.gallery = [];
    const html = render(view);
    expect(html).toContain("Los servicios aparecerán aquí");
    expect(html).toContain("Tu álbum está esperando");
    expect(html).not.toContain("portfolio/chrome.webp");
    expect(html).toContain("disabled");
  });
  it("honors all optional section controls", () => {
    const view = pinkFixtureView();
    view.config.visibility = { gallery: false, pocket: false, policies: false };
    const html = render(view);
    expect(html).not.toContain('id="gallery"');
    expect(html).not.toContain("LOVE POCKET");
    expect(html).not.toContain("antes_de_tu_cita.txt");
  });
  it("uses business identity when no identity override was saved", () => {
    const view = pinkFixtureView();
    view.config = emptyPinkConfig();
    view.business.name = "Mi estudio independiente";
    view.preview = false;
    const html = render(view);
    expect(html).toContain("Mi estudio independiente");
    expect(html).not.toContain("PRECIOS HISTÓRICOS");
    expect(html).not.toContain("portfolio/chrome.webp");
  });
  it("renders a temporary upload preview without sending blob media into booking config", () => {
    const view = pinkFixtureView();
    view.config.heroImage = "blob:http://localhost:3005/local-upload";
    expect(render(view)).toContain("local-upload");
  });
  it("filters native gallery categories without resurrecting deleted legacy labels", () => {
    const view = pinkFixtureView();
    view.config.galleryCategories = [{ id: "cat-nuevo", label: "Nueva categoría", order: 0 }];
    view.config.gallery = [{ ...view.config.gallery[0], categoryIds: ["cat-nuevo"] }];
    expect(render(view)).toContain("Nueva categoría");
    view.config.galleryCategories = [];
    view.config.gallery[0].categoryIds = [];
    expect(render(view)).not.toContain('aria-pressed="false">Pink</button>');
  });
});

describe("Y2K native template", () => {
  it("keeps both headline lines independent through previews and saved template switches", () => {
    const config = pinkConfigSchema.parse({ ...pinkFixtureView().config, appearance: { titleTopFinish: "silver-chrome", titleTopFont: "script", titleFinish: "pink-chrome", titleFont: "bubble", background: "leopard", patternColor: "#c49a6c" } });
    const away = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: config, templateConfigs: {} }, "bella", 1);
    const back = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: away.config, templateConfigs: away.snapshots }, "y2k", 1);
    expect(pinkConfigSchema.parse(back.config).appearance).toEqual(config.appearance);
    const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config }, "http://localhost:3005");
    expect(preview.success && preview.data.config.appearance).toEqual(config.appearance);
    const html = renderToStaticMarkup(React.createElement(PinkY2k, { view: { ...pinkFixtureView(), config }, today: "2026-10-13" }));
    expect(html).toContain('data-title-finish="silver-chrome" data-title-font="script"');
    expect(html).toContain('data-title-finish="pink-chrome" data-title-font="bubble"');
    expect(html).toContain('data-pink-text="uñas,"');
    expect(html).toContain("--pink-pattern-color:#c49a6c");
    expect(pinkPublicationError(config)).toBeNull();
  });
  it("preserves older headline settings and only decouples the frame when a color is chosen", () => {
    const config = pinkConfigSchema.parse({ ...pinkFixtureView().config, appearance: { titleFinish: "pink-chrome", background: "leopard" } });
    expect(config.appearance).toMatchObject({ titleTopFinish: "jelly", titleTopFont: "bubble", titleFinish: "pink-chrome", patternColor: "" });
    expect(pinkPatternColor(config.appearance, config.colors)).not.toBe(pinkPatternColor(config.appearance, { accent: "#000000", background: "#ffffff" }));
    const custom = { ...config.appearance, patternColor: "#c49a6c" };
    expect(pinkPatternColor(custom, config.colors)).toBe("#c49a6c");
    expect(pinkPatternColor(custom, { accent: "#000000", background: "#ffffff" })).toBe("#c49a6c");
    for (const patch of [{ patternColor: "red" }, { patternColor: "url(https://evil.test)" }, { titleTopFont: "Comic Sans" }, { titleTopFinish: "custom" }]) expect(pinkConfigSchema.safeParse({ ...config, appearance: { ...config.appearance, ...patch } }).success).toBe(false);
  });
  it("reads existing drafts with the original appearance and defaults partial settings", () => {
    const config = pinkFixtureView().config;
    const { appearance: _appearance, ...legacy } = config;
    expect(_appearance).toEqual(PINK_STYLE_PRESETS[0].appearance);
    expect(pinkConfigSchema.parse(legacy).appearance).toEqual(PINK_STYLE_PRESETS[0].appearance);
    expect(pinkConfigSchema.parse({ ...legacy, appearance: { titleFinish: "silver-chrome" } }).appearance).toEqual({ ...PINK_STYLE_PRESETS[0].appearance, titleFinish: "silver-chrome" });
    expect(pinkConfigSchema.safeParse({ ...config, appearance: { ...config.appearance, background: "url(https://evil.test)" } }).success).toBe(false);
    expect(pinkConfigSchema.safeParse({ ...config, appearance: { ...config.appearance, css: "body{display:none}" } }).success).toBe(false);
  });
  it("keeps chosen finishes through draft switching, trusted previews and publication", () => {
    for (const preset of PINK_STYLE_PRESETS) {
      const config = { ...pinkFixtureView().config, appearance: { ...preset.appearance } };
      const selected = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: config, templateConfigs: {} }, "bella", 1);
      const restored = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: selected.config, templateConfigs: selected.snapshots }, "y2k", 1);
      expect(pinkConfigSchema.parse(restored.config).appearance).toEqual(preset.appearance);
      const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config }, "http://localhost:3007");
      expect(preview.success && preview.data.config.appearance).toEqual(preset.appearance);
      expect(pinkPublicationError(config)).toBeNull();
      const html = renderToStaticMarkup(React.createElement(PinkY2k, { view: { ...pinkFixtureView(), config }, today: "2026-10-13" }));
      expect(html).toContain(`data-title-finish="${preset.appearance.titleFinish}"`);
      expect(html).toContain(`data-background="${preset.appearance.background}"`);
      expect(html).toContain('aria-label="Tus uñas, tu universo."');
      expect(html).toContain('aria-label="Reserva tu hora"');
      if (preset.appearance.titleFont === "script") expect(html).toContain('data-pink-text="universo."');
    }
  });
  it("preserves a bounded pattern amount and reads older appearance settings", () => {
    const config = pinkFixtureView().config;
    const { patternCoverage, ...oldAppearance } = config.appearance;
    expect(patternCoverage).toBe(20);
    expect(pinkConfigSchema.parse({ ...config, appearance: oldAppearance }).appearance.patternCoverage).toBe(20);
    for (const amount of [0, 20, 63, 100]) {
      const input = { ...config, appearance: { ...config.appearance, background: "leopard", patternCoverage: amount } };
      const parsed = pinkConfigSchema.parse(input);
      const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config: parsed }, "http://localhost:3007");
      expect(preview.success && preview.data.config.appearance.patternCoverage).toBe(amount);
      const html = renderToStaticMarkup(React.createElement(PinkY2k, { view: { ...pinkFixtureView(), config: parsed }, today: "2026-10-13" }));
      expect(html).toContain(`data-pattern-coverage="${amount}"`);
      expect(pinkPublicationError(parsed)).toBeNull();
    }
    for (const amount of [-1, 101, 1.5, "50", NaN]) expect(pinkConfigSchema.safeParse({ ...config, appearance: { ...config.appearance, patternCoverage: amount } }).success).toBe(false);
  });
  it("defaults older pattern settings to the full page and preserves the chosen scope", () => {
    const config = pinkFixtureView().config;
    const { patternScope, ...oldAppearance } = config.appearance;
    expect(patternScope).toBe("page");
    expect(pinkConfigSchema.parse({ ...config, appearance: oldAppearance }).appearance.patternScope).toBe("page");
    for (const scope of ["hero", "page"] as const) {
      const next = { ...config, appearance: { ...config.appearance, background: "leopard" as const, patternScope: scope } };
      const preview = parsePinkPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 5, config: next }, "http://localhost:3005");
      expect(preview.success && preview.data.config.appearance.patternScope).toBe(scope);
      const away = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: next, templateConfigs: {} }, "bella", 1);
      const restored = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: away.config, templateConfigs: away.snapshots }, "y2k", 1);
      expect(pinkConfigSchema.parse(restored.config).appearance.patternScope).toBe(scope);
    }
    expect(pinkConfigSchema.safeParse({ ...config, appearance: { ...config.appearance, patternScope: "custom-css" } }).success).toBe(false);
  });
  it("registers an empty, generic template without fixture media or business contact", () => {
    const template = resolveTemplate("y2k", 1), config = emptyPinkConfig();
    expect(template.name).toBe("Y2K");
    expect(template.defaultConfig()).toEqual(config);
    expect([config.displayName, config.heroImage, config.logo, config.instagram, config.facebook, config.phone, config.contactEmail]).toEqual(Array(7).fill(""));
    expect(config.gallery).toEqual([]);
    expect(config.visibility.policies).toBe(false);
    expect(pinkFixtureView().business.name).toBe("Y2K");
    expect(pinkFixtureView().catalog.business.name).toBe("Y2K");
    expect(pinkFixtureView().config.instagram).toBe("");
  });
  it("retains tenant content on selection and restores Y2K settings after switching away", () => {
    const source = resolveTemplate("bella", 1).readConfig(fixtureView("a").config);
    const selected = templateSwitchDraft({ templateKey: "bella", templateVersion: 1, draftConfig: source, templateConfigs: {} }, "y2k", 1);
    const draft = pinkConfigSchema.parse(selected.config);
    expect(draft.displayName).toBe(source.displayName);
    expect(draft.heroImage).toBe(source.heroImage);
    expect(draft.galleryCategories).toEqual(source.galleryCategories);
    draft.pocket.name = "MI POCKET";
    draft.headline = ["Mi idea,", "mi mundo."];
    const away = templateSwitchDraft({ templateKey: "y2k", templateVersion: 1, draftConfig: draft, templateConfigs: selected.snapshots }, "ritual", 1);
    const restored = templateSwitchDraft({ templateKey: "ritual", templateVersion: 1, draftConfig: away.config, templateConfigs: away.snapshots }, "y2k", 1);
    expect(restored.config).toEqual(draft);
  });
  it("checks image, headline, policy and contrast before publication", () => {
    expect(pinkPublicationError(emptyPinkConfig())).toContain("portada");
    const config = pinkFixtureView().config;
    expect(pinkPublicationError(config)).toBeNull();
    expect(pinkPublicationError({ ...config, headline: ["", ""] })).toContain("titular");
    expect(pinkPublicationError({ ...config, colors: { ...config.colors, accent: "#ffffff" } })).toContain("contraste");
    expect(pinkPublicationError({ ...config, policy: { ...config.policy, body: "" } })).toContain("condiciones");
  });
  it("allows same-origin blob previews while refusing blobs in saved config and foreign previews", () => {
    const origin = "http://localhost:3005", blob = `blob:${origin}/fixture`;
    const config = { ...emptyPinkConfig(), heroImage: blob, contactEmail: "typing", whatsapp: "+" };
    const message = { protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config };
    expect(parsePinkPreview(message, origin).success).toBe(true);
    expect(parsePinkPreview(message, "https://evil.test").success).toBe(false);
    expect(pinkConfigSchema.safeParse(config).success).toBe(false);
    expect(parsePinkPreview({ ...message, sequence: -1 }, origin).success).toBe(false);
  });
  it("rejects orphan, duplicate and reordered gallery categories", () => {
    const config = pinkFixtureView().config;
    expect(pinkConfigSchema.safeParse({ ...config, gallery: [{ ...config.gallery[0], categoryIds: ["cat-foreign"] }] }).success).toBe(false);
    const category = { id: "cat-pink", label: "Pink", order: 0 };
    expect(pinkConfigSchema.safeParse({ ...config, galleryCategories: [category, category] }).success).toBe(false);
    expect(pinkConfigSchema.safeParse({ ...config, galleryCategories: [{ ...category, order: 1 }] }).success).toBe(false);
  });
});
