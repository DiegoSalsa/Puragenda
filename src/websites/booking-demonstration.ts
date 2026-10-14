import type { WebsiteView } from "./types";

// A separate, explicit private-preview experience. Real website booking is unchanged.
export function websiteBookingDemonstration<T>(view: WebsiteView<T>): WebsiteView<T> {
  if (!view.preview) return view;
  return {
    ...view,
    previewExperience: "booking",
    catalog: {
      ...view.catalog,
      mode: "demo",
      rules: {
        staffSelection: view.catalog.rules?.staffSelection ?? "REQUIRED",
        depositEnabled: view.catalog.rules?.depositEnabled ?? false,
        maxServicesPerBooking: view.catalog.rules?.maxServicesPerBooking ?? 1,
        allowSameDayBookings: false,
        maxDaysAhead: Math.min(90, Math.max(7, view.catalog.rules?.maxDaysAhead ?? 90)),
      },
    },
  };
}
