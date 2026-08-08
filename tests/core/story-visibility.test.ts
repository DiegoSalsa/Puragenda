import { describe, expect, it } from "vitest";
import { getStoryVisibilityDefaults } from "@/core/story-visibility";

describe("story visibility defaults", () => {
  it("keeps individual single-location stories free of redundant labels", () => {
    expect(getStoryVisibilityDefaults({
      isIndividualPlan: true,
      hasMultipleLocations: false,
    })).toEqual({
      showProfessional: false,
      showLocationName: false,
      showAddress: false,
    });
  });

  it("shows team and location context for multi-location team businesses", () => {
    expect(getStoryVisibilityDefaults({
      isIndividualPlan: false,
      hasMultipleLocations: true,
    })).toEqual({
      showProfessional: true,
      showLocationName: true,
      showAddress: false,
    });
  });
});
