/** Neutral booking and catalog contracts shared by all website templates. */
export type BookingMode = "demo" | "preview" | "connected";
export type ServiceOption = { id: string; name: string; priceDelta: number; durationDelta: number; isHomeService: boolean };
export type OptionCategory = { id: string; name: string; isRequired: boolean; maxSelections: number; alternatives: ServiceOption[] };
export type StudioService = {
  id: string; name: string; description: string; duration: number; price: number;
  image: string; category: string; categoryId: string; categoryPosition: number;
  optionCategories: OptionCategory[]; locationIds: string[]; depositAmount?: number;
};
export type StudioStaff = { id: string; name: string; image: string | null; serviceIds: string[]; locationIds: string[] };
export type StudioLocation = { id: string; name: string; timezone: string };
export type Catalog = {
  mode: BookingMode; business: { name: string; timezone: string; currency: string };
  services: StudioService[]; staff: StudioStaff[]; locations: StudioLocation[]; supportsAnyStaff: boolean;
  rules?: { staffSelection: "NONE" | "REQUIRED"; allowSameDayBookings: boolean; maxDaysAhead: number; depositEnabled: boolean; maxServicesPerBooking: number };
};
export type Selection = { serviceId: string; serviceIds?: string[]; optionIds: string[]; staffId: string; locationId: string };
export type AvailabilityQuery = Selection & { date: string };
export type Slot = { startTime: string; endTime: string; label: string; staffId: string | null };
export type Availability = { date: string; slots: Slot[]; mode: BookingMode };
export type Customer = { customerName: string; customerEmail: string; customerPhone: string; customerAddress?: string };
export type BookingRequest = AvailabilityQuery & Customer & { startTime: string; staffAssignments?: Array<{ serviceId: string; staffId: string }> };
export type BookingResult = { kind: "demo" | "confirmed" | "pending"; id?: string; message: string; paymentUrl?: string; recoveryRequired?: boolean };
export interface BookingProvider {
  canonicalBooking?: boolean;
  getCatalog(): Promise<Catalog>;
  getAvailability(query: AvailabilityQuery): Promise<Availability>;
  createBooking(request: BookingRequest, idempotencyKey?: string): Promise<BookingResult>;
}
