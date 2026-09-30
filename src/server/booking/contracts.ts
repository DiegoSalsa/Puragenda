import type { BookingOptionCategory } from "@/core/booking-selection";

export type BookingServiceDto = {
  id: string; name: string; description: string | null; imageUrl: string | null;
  category: { id: string; name: string } | null; price: number; duration: number;
  locationIds: string[]; optionCategories: BookingOptionCategory[];
  depositAmount: number;
};
export type BookingCatalogDto = {
  version: "1";
  business: { id: string; slug: string; name: string; timezone: string; currency: string };
  services: BookingServiceDto[];
  staff: Array<{ id: string; name: string; imageUrl: string | null; serviceIds: string[]; locationIds: string[]; allServices: boolean }>;
  locations: Array<{ id: string; slug: string; name: string; address: string | null; mapsUrl: string | null; timezone: string; isPrimary: boolean }>;
  capabilities: { singleAppointment: true; production: false; recurring: false; firstAvailable: boolean; idempotency: true; maxDaysAhead: number };
  rules: {
    scheduleMode: "BUSINESS" | "STAFF"; staffSelection: "NONE" | "REQUIRED";
    slotInterval: number; minAdvanceBookingMinutes: number; advanceAppliesTo: "SAME_DAY";
    allowSameDayBookings: boolean; depositEnabled: boolean;
    customerFields: { name: true; email: true; phone: true; address: "HOME_OPTIONS_ONLY" };
  };
};
export type BookingAvailabilityDto = {
  version: "1"; date: string; timezone: string; locationId: string;
  selection: { serviceId: string; selectedOptionAlternativeIds: string[]; duration: number; price: number; currency: string; requiresAddress: boolean };
  slots: Array<{ startTime: string; endTime: string; staffId: string | null }>;
};
