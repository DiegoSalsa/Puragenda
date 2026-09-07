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
    expect(marketplaceVisibleServices(["Corte", "Barba", "Cejas", "Fade", "Kids"])).toEqual({
      visible: ["Corte", "Barba", "Cejas"],
      extra: 2,
    });
  });
});
