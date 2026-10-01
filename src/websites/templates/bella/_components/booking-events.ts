export const bookingEvent = "bella:book";
export function openBooking(serviceId?: string) {
  window.dispatchEvent(new CustomEvent(bookingEvent, { detail: { serviceId } }));
}
