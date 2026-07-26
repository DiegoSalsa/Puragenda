export const WIDGET_TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export const WIDGET_SHADOW_STYLES = ["none", "soft", "strong"] as const;

export type WidgetTextAlign = (typeof WIDGET_TEXT_ALIGNMENTS)[number];
export type WidgetShadowStyle = (typeof WIDGET_SHADOW_STYLES)[number];

export function normalizeWidgetTextAlign(value: string): WidgetTextAlign {
  return WIDGET_TEXT_ALIGNMENTS.includes(value as WidgetTextAlign)
    ? (value as WidgetTextAlign)
    : "left";
}

export function normalizeWidgetShadowStyle(value: string): WidgetShadowStyle {
  return WIDGET_SHADOW_STYLES.includes(value as WidgetShadowStyle)
    ? (value as WidgetShadowStyle)
    : "soft";
}

export function isSafeWidgetLinkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}
