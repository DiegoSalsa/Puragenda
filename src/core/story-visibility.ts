export function getStoryVisibilityDefaults(input: {
  isIndividualPlan: boolean;
  hasMultipleLocations: boolean;
}) {
  return {
    showProfessional: !input.isIndividualPlan,
    showLocationName: input.hasMultipleLocations,
    showAddress: false,
  };
}
