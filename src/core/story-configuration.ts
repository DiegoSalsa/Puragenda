import type { AvailabilityStoryRequest } from "@/server/validations/availability-story";

export function storyTemplateBackgroundPath(template: AvailabilityStoryRequest["template"]): string {
  const files = {
    AURORA: "editorial-paper.webp",
    EDITORIAL: "organic-paper.webp",
    BOLD: "graphic-paper.webp",
    MINIMAL: "editorial-paper.webp",
    FRAME: "graphic-paper.webp",
  };
  return `/story-templates/${files[template]}`;
}

/** Hidden controls must not keep constraining a different story mode. */
export function normalizeStoryConfiguration(input: AvailabilityStoryRequest): AvailabilityStoryRequest {
  const customDates = input.showSchedule && input.range === "CUSTOM";
  return {
    ...input,
    targetDate: customDates ? input.targetDate : undefined,
    endDate: customDates ? input.endDate : undefined,
    excludedDates: input.showSchedule ? input.excludedDates : [],
    selectedSlots: input.showSchedule ? input.selectedSlots : [],
  };
}

/** Design and local slot selection can change without recalculating availability. */
export function storyAvailabilityKey(input: AvailabilityStoryRequest): string {
  const value = normalizeStoryConfiguration(input);
  return JSON.stringify({
    locationId: value.locationId,
    staffId: value.staffId ?? null,
    serviceIds: value.allServices ? [] : [...value.serviceIds].sort(),
    allServices: value.allServices,
    showSchedule: value.showSchedule,
    ...(value.showSchedule ? {
      range: value.range,
      targetDate: value.targetDate,
      endDate: value.endDate,
      excludedDates: [...value.excludedDates].sort(),
    } : {}),
  });
}
