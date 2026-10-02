import type { loadBookingContext } from "@/server/booking/read.service";

export function bookingFixture(): Awaited<ReturnType<typeof loadBookingContext>> {
  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00", isOpen: true, breakStart: "13:00", breakEnd: "14:00" }));
  return {
    id: "business-1", slug: "fixture", name: "Fixture", timezone: "America/Santiago", currencyCode: "CLP",
    slotInterval: 30, minAdvanceBookingMinutes: 60, allowSameDayBookings: true, maxServicesPerBooking: 1,
    depositRequired: false, depositPaymentMode: "MANUAL_LINK", mpAccessToken: "never-serialize", subscription: { plan: "EQUIPO" },
    businessHours: hours, scheduleOverrides: [],
    services: [{ id: "service-1", name: "Cita", description: null, imageUrl: null, price: 20000, duration: 60, depositAmount: 5000,
      availabilityType: "NORMAL", specialWeekDays: [], specialStartDate: null, specialEndDate: null, specialStartTime: null, specialEndTime: null,
      category: { id: "category-1", name: "Categoría", businessId: "business-1", position: 0 }, locations: [{ locationId: "location-1" }],
      optionCategories: [{ id: "option-category", name: "Formato", isRequired: true, maxSelections: 1, alternatives: [
        { id: "option-1", name: "Local", priceDelta: 0, durationDelta: 0, isHomeService: false },
        { id: "option-2", name: "Domicilio", priceDelta: 5000, durationDelta: 30, isHomeService: true },
      ] }],
    }],
    staff: ["staff-a", "staff-b"].map((id) => ({ id, name: id, imageUrl: null, services: [{ id: "service-1" }],
      schedule: [], scheduleOverrides: [], locations: [{ locationId: "location-1", schedule: hours.map(({ isOpen, ...hour }) => ({ ...hour, isWorking: isOpen })) }],
    })),
    locations: [{ id: "location-1", slug: "principal", name: "Principal", address: null, mapsUrl: null, timezone: "America/Santiago", isPrimary: true, hours, scheduleOverrides: [] }],
  };
}
