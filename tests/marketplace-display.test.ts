import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  marketplaceCategoryDisplayName,
  marketplacePublicLocationLabel,
  marketplaceVisibleServices,
} from "@/lib/marketplace";

describe("marketplace directory display labels", () => {
  it("uses natural category names without changing slugs", () => {
    expect(marketplaceCategoryDisplayName("barberias", "Barberías")).toBe("Barbería");
    expect(marketplaceCategoryDisplayName("peluquerias", "Peluquerías")).toBe("Peluquería");
    expect(marketplaceCategoryDisplayName("manicure", "Manicure / Nail Studio")).toBe("Manicure / Nail Studio");
    expect(marketplaceCategoryDisplayName("bienestar", "Bienestar")).toBe("Bienestar");
  });

  it("hides internal location names such as Local principal", () => {
    expect(marketplacePublicLocationLabel("Principal", "Soccerbarber")).toBeNull();
    expect(marketplacePublicLocationLabel("Local principal", "Soccerbarber")).toBeNull();
    expect(marketplacePublicLocationLabel("Sucursal principal", "Soccerbarber")).toBeNull();
    expect(marketplacePublicLocationLabel("Soccerbarber", "Soccerbarber")).toBeNull();
    expect(marketplacePublicLocationLabel("Sucursal Centro", "Soccerbarber")).toBe("Sucursal Centro");
  });

  it("shows at most three services plus a remainder count", () => {
    expect(marketplaceVisibleServices([])).toEqual({ visible: [], extra: 0 });
    expect(marketplaceVisibleServices(["Corte"])).toEqual({ visible: ["Corte"], extra: 0 });
    expect(marketplaceVisibleServices(["Corte", "Barba"])).toEqual({
      visible: ["Corte", "Barba"],
      extra: 0,
    });
    expect(marketplaceVisibleServices(["Corte", "Barba", "Cejas"])).toEqual({
      visible: ["Corte", "Barba", "Cejas"],
      extra: 0,
    });
    expect(marketplaceVisibleServices(["Corte", "Barba", "Cejas", "Fade", "Kids"])).toEqual({
      visible: ["Corte", "Barba", "Cejas"],
      extra: 2,
    });
  });

  it("does not rewrite intentional commercial capitalization", () => {
    const card = readFileSync(join(process.cwd(), "src/components/marketplace/marketplace-listing-card.tsx"), "utf8");
    expect(card).toContain("{name}");
    expect(card).not.toContain("toLowerCase(");
    expect(card).not.toContain("toTitleCase");
    expect(card).not.toMatch(/name\.replace/);
    expect(["LottySkin", "Lucy.CCP", "PuroCode"]).toEqual(["LottySkin", "Lucy.CCP", "PuroCode"]);
  });
});
