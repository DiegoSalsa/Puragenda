import { bellaConfigSchema, emptyBellaConfig, type BellaConfig } from "./config";
import { migrateBellaCategories, readBellaConfig } from "./templates/bella/categories";
import { effectiveWebsiteHeadline } from "./publishing";
import { paletteTokens, validatePalette } from "./palettes";
import { BELLA_PALETTES } from "./palettes";
import { emptyMatchdayConfig, matchdayConfigSchema, readMatchdayConfig, type MatchdayConfig } from "./templates/matchday/config";
import { MATCHDAY_PALETTES, matchdayTokens, validMatchdayPalette } from "./templates/matchday/palettes";
import { emptyRitualConfig, readRitualConfig, ritualConfigSchema, type RitualConfig } from "./templates/ritual/config";
import { RITUAL_PALETTES, ritualTokens, validRitualPalette } from "./templates/ritual/palettes";
import { createElement, type ComponentType } from "react";
import type { WebsiteView } from "./types";
import type { WebsiteEditorProps } from "./editor-types";
export type WebsiteConfig = BellaConfig | MatchdayConfig | RitualConfig;
function defineTemplate<C extends WebsiteConfig>(definition: {
  key: string; name: string; version: number; industries: string[];
  capabilities: { gallery: boolean; nativeBooking: boolean; multiLocation: boolean; controlledTheme: boolean; staffEditorial: boolean; process: boolean };
  editor: { category: string; sections: readonly string[]; palettes: readonly unknown[]; customControls: readonly string[] };
  preview: { thumbnail: string; desktop: string; mobile: string };
  configSchema: { parse: (input: unknown) => C }; defaultConfig: () => C; readConfig: (input: unknown) => C; parseDraft: (input: unknown) => C;
  publicationError: (config: C) => string | null;
  loadComponent: () => Promise<ComponentType<{ view: WebsiteView<C> }>>;
  loadEditor: () => Promise<ComponentType<WebsiteEditorProps<C>>>;
}) {
  return { ...definition,
    publicationError: (input: unknown) => definition.publicationError(definition.readConfig(input)),
    loadComponent: async () => {
      const Component = await definition.loadComponent();
      return function TemplateRenderer({ view }: { view: WebsiteView<WebsiteConfig> }) { return createElement(Component, { view: { ...view, config: definition.readConfig(view.config) } }); };
    },
    loadEditor: async () => {
      const Editor = await definition.loadEditor();
      return function TemplateEditor(props: WebsiteEditorProps<WebsiteConfig>) { return createElement(Editor, { ...props, initial: definition.readConfig(props.initial), view: { ...props.view, config: definition.readConfig(props.view.config) } }); };
    },
  };
}

// Visual settings belong to each template. Infrastructure does not prescribe layout.
export const templateRegistry = {
  bella: defineTemplate<BellaConfig>({
    key: "bella", name: "Bella", version: 1,
    industries: ["belleza", "uñas", "cejas", "pestañas", "estética", "peluquería"],
    capabilities: { gallery: true, nativeBooking: true, multiLocation: true, controlledTheme: true, staffEditorial: false, process: true },
    editor: { category: "Beauty / Estética", sections: ["design", "hero", "gallery", "business", "contact", "domain"], palettes: BELLA_PALETTES, customControls: ["process"] },
    preview: { thumbnail: "/websites/previews/bella.svg", desktop: "/website-preview?template=bella", mobile: "/website-preview?template=bella&viewport=mobile" },
    configSchema: bellaConfigSchema,
    defaultConfig: emptyBellaConfig,
    readConfig: readBellaConfig,
    parseDraft: migrateBellaCategories,
    publicationError: (config: BellaConfig) => {
      if (config.paletteMode === "custom" && config.customPalette && !validatePalette(paletteTokens(config.accent, config.customPalette, config.paletteMode)).valid) return "La paleta personalizada necesita más contraste antes de publicar";
      return !config.heroImage || !effectiveWebsiteHeadline(config) ? "Agrega una portada y un titular antes de publicar" : null;
    },
    loadComponent: () => import("./templates/bella/Lazy").then(module => module.default),
    loadEditor: () => import("@/app/dashboard/website/website-editor").then(module => module.default),
  }),
  matchday: defineTemplate<MatchdayConfig>({
    key: "matchday", name: "Matchday", version: 1,
    industries: ["barbería", "peluquería masculina", "grooming", "barber studio", "cabello", "barba"],
    capabilities: { gallery: true, nativeBooking: true, multiLocation: true, controlledTheme: true, staffEditorial: true, process: false },
    editor: { category: "Barbería / Grooming", sections: ["design", "hero", "services", "staff", "gallery", "business", "contact", "domain"], palettes: MATCHDAY_PALETTES, customControls: ["marquee", "staffEditorial", "graphicPhrase"] },
    preview: { thumbnail: "/websites/previews/matchday.svg", desktop: "/website-preview?template=matchday", mobile: "/website-preview?template=matchday&viewport=mobile" },
    configSchema: matchdayConfigSchema, defaultConfig: emptyMatchdayConfig, readConfig: readMatchdayConfig, parseDraft: matchdayConfigSchema.parse,
    publicationError: config => !validMatchdayPalette(matchdayTokens(config)) ? "La paleta necesita más contraste antes de publicar" : !config.heroImage || !config.headline ? "Agrega una portada y un titular antes de publicar" : null,
    loadComponent: () => import("./templates/matchday/Lazy").then(module => module.default),
    loadEditor: () => import("@/app/dashboard/website/matchday-editor").then(module => module.default),
  }),
  ritual: defineTemplate<RitualConfig>({
    key: "ritual", name: "Ritual", version: 1,
    industries: ["masajes", "masoterapia", "reiki", "terapias holísticas", "wellness", "piedras calientes", "reflexología", "spa", "terapias corporales", "bienestar"],
    capabilities: { gallery: true, nativeBooking: true, multiLocation: true, controlledTheme: true, staffEditorial: true, process: false },
    editor: { category: "Masajes / Wellness / Terapias", sections: ["design", "hero", "services", "staff", "gallery", "faq", "business", "contact", "domain"], palettes: RITUAL_PALETTES, customControls: ["sensorial", "faq", "staffEditorial", "visibility", "featuredService", "customPalette"] },
    preview: { thumbnail: "/websites/previews/ritual.svg", desktop: "/website-preview?template=ritual", mobile: "/website-preview?template=ritual&viewport=mobile" },
    configSchema: ritualConfigSchema, defaultConfig: emptyRitualConfig, readConfig: readRitualConfig, parseDraft: readRitualConfig,
    publicationError: config => !validRitualPalette(ritualTokens(config)) ? "La paleta necesita más contraste antes de publicar" : !config.heroImage || !config.headline ? "Agrega una portada y un titular antes de publicar" : null,
    loadComponent: () => import("./templates/ritual/Lazy").then(module => module.default),
    loadEditor: () => import("@/app/dashboard/website/ritual-editor").then(module => module.default),
  }),
} as const;
export type TemplateKey = keyof typeof templateRegistry;
export function resolveTemplate(key: string, version: number) {
  if (!Object.hasOwn(templateRegistry, key)) throw new Error("Template o versión no disponible");
  const template = templateRegistry[key as TemplateKey];
  if (version !== template.version) throw new Error("Template o versión no disponible");
  return template;
}
