import { bellaConfigSchema } from "./config";

// Visual settings belong to each template. Infrastructure does not prescribe layout.
export const templateRegistry = {
  bella: {
    key: "bella", name: "Bella", version: 1,
    industries: ["belleza", "uñas", "cejas", "pestañas", "estética", "peluquería"],
    capabilities: { gallery: true, nativeBooking: true, multiLocation: true, controlledTheme: true },
    configSchema: bellaConfigSchema,
    loadComponent: () => import("./templates/bella/Bella").then(module => module.default),
  },
} as const;
export type TemplateKey = keyof typeof templateRegistry;
export function resolveTemplate(key: string, version: number) {
  if (!Object.hasOwn(templateRegistry, key)) throw new Error("Template o versión no disponible");
  const template = templateRegistry[key as TemplateKey];
  if (version !== template.version) throw new Error("Template o versión no disponible");
  return template;
}
