import { describe, expect, it } from "vitest";
import {
  isSafeWidgetLinkUrl,
  normalizeWidgetShadowStyle,
  normalizeWidgetTextAlign,
} from "@/core/widget-studio";

describe("widget studio value normalization", () => {
  it("normalizes closed-set presentation values", () => {
    expect(normalizeWidgetTextAlign("center")).toBe("center");
    expect(normalizeWidgetTextAlign("justify")).toBe("left");
    expect(normalizeWidgetShadowStyle("strong")).toBe("strong");
    expect(normalizeWidgetShadowStyle("glow")).toBe("soft");
  });

  it("accepts only HTTP links without embedded credentials", () => {
    expect(isSafeWidgetLinkUrl("https://example.com/oferta")).toBe(true);
    expect(isSafeWidgetLinkUrl("http://localhost:3000/demo")).toBe(true);
    expect(isSafeWidgetLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeWidgetLinkUrl("https://user:password@example.com")).toBe(false);
    expect(isSafeWidgetLinkUrl("not a url")).toBe(false);
  });
});
