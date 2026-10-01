export const BELLA_PALETTES = [
  { key: "coral", name: "Coral", description: "Energía y detalle", colors: ["#e74732", "#b62d1e", "#ededee", "#202021"] },
  { key: "plum", name: "Lila", description: "Suave y editorial", colors: ["#cc9ada", "#653070", "#ededee", "#202021"] },
  { key: "forest", name: "Bosque", description: "Natural y sereno", colors: ["#83b69c", "#28553d", "#ededee", "#202021"] },
] as const;
export type BellaPalette = { primary: string; text: string; background: string; ink: string };
export function paletteTokens(accent: (typeof BELLA_PALETTES)[number]["key"], custom?: BellaPalette, mode: "preset" | "custom" = "preset"): BellaPalette {
  if (mode === "custom" && custom) return custom;
  const palette = BELLA_PALETTES.find(item => item.key === accent) ?? BELLA_PALETTES[0];
  return { primary: palette.colors[0], text: palette.colors[1], background: palette.colors[2], ink: palette.colors[3] };
}
function channel(value: number) { const v = value / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }
export function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => { const values = [0, 2, 4].map(index => channel(Number.parseInt(hex.slice(index + 1, index + 3), 16))); return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]; };
  const a = luminance(first), b = luminance(second); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export function validatePalette(palette: BellaPalette) { const body = contrastRatio(palette.ink, palette.background), action = contrastRatio(palette.text, palette.primary); return { valid: body >= 4.5 && action >= 4.5, body, action }; }
