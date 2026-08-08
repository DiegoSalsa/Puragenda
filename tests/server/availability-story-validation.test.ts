import { describe, expect, it } from "vitest";
import { availabilityStoryRequestSchema, storyPresetCreateSchema } from "@/server/validations/availability-story";

const baseStory = {
  locationId: "location-1",
  allServices: true,
  serviceIds: [],
  range: "NEXT_3_AVAILABLE",
  template: "MINIMAL",
  headline: "Últimos cupos",
  accentColor: "#7C3AED",
  secondaryColor: "#FF4F87",
  canvasColor: "#FFF8ED",
  storyTextColor: "#171717",
};

describe("availability story validation", () => {
  it("applies safe defaults for a quick story", () => {
    const parsed = availabilityStoryRequestSchema.parse(baseStory);
    expect(parsed).toMatchObject({
      objective: "FILL_SLOTS",
      backgroundMode: "ART",
      artIntensity: 0.38,
      fontStyle: "MODERN",
      logoFit: "CONTAIN",
      excludedDates: [],
      selectedSlots: [],
    });
  });

  it("requires both dates for a custom range", () => {
    expect(availabilityStoryRequestSchema.safeParse({ ...baseStory, range: "CUSTOM", targetDate: "2026-08-10" }).success).toBe(false);
    expect(availabilityStoryRequestSchema.safeParse({ ...baseStory, range: "CUSTOM", targetDate: "2026-08-10", endDate: "2026-08-12" }).success).toBe(true);
  });

  it("stores the complete configuration in a reusable preset", () => {
    const configuration = availabilityStoryRequestSchema.parse(baseStory);
    expect(storyPresetCreateSchema.parse({ name: "Última hora", configuration })).toMatchObject({
      name: "Última hora",
      isDefault: false,
      configuration: { template: "MINIMAL" },
    });
  });
});
