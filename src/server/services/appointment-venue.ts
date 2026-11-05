import { prisma } from "@/server/db/prisma";

export const appointmentVenueSelect = { businessId: true, timezone: true, address: true, mapsUrl: true } as const;
type Venue = { businessId?: string; timezone?: string; address?: string | null; mapsUrl?: string | null };
export type AppointmentVenueSource = { businessId?: string; locationId?: string | null; location?: Venue | null; business: Venue };

/** Resolve archived branches too: a notification describes the booked venue.
 * Scope fallback reads by business, never by a client-supplied location alone.
 */
export async function resolveAppointmentVenue(appointment: AppointmentVenueSource) {
  let location = appointment.location;
  if (location === undefined && appointment.locationId && appointment.businessId) {
    location = await prisma.businessLocation.findFirst({
      where: { id: appointment.locationId, businessId: appointment.businessId }, select: appointmentVenueSelect,
    });
  }
  if (location?.businessId && appointment.businessId && location.businessId !== appointment.businessId) location = null;
  return {
    timezone: location?.timezone || appointment.business.timezone || "America/Santiago",
    // Missing branch details must not silently send a customer to the head office.
    businessAddress: location ? location.address : appointment.business.address,
    businessMapsUrl: location ? location.mapsUrl : appointment.business.mapsUrl,
  };
}
