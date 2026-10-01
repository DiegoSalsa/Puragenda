import type { Customer, Slot, StudioService } from "./puragenda/types";
export type BookingState = { step: number; serviceId: string; optionIds: string[]; staffId: string; locationId: string; date: string; slot: Slot | null; customer: Customer };
export type BookingAction =
  | { type: "service"; service: StudioService }
  | { type: "options"; ids: string[] }
  | { type: "staff"; id: string }
  | { type: "location"; id: string }
  | { type: "date"; date: string }
  | { type: "slot"; slot: Slot }
  | { type: "customer"; customer: Customer }
  | { type: "draft"; customer: Customer }
  | { type: "reset"; date: string }
  | { type: "step"; step: number }
  | { type: "conflict" };
export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "service": return { ...state, serviceId: action.service.id, optionIds: [], staffId: "", slot: null, step: action.service.optionCategories.length ? 0 : 1 };
    case "options": return { ...state, optionIds: action.ids, slot: null };
    case "location": return { ...state, locationId: action.id, serviceId: "", optionIds: [], staffId: "", slot: null, step: 0 };
    case "staff": return { ...state, staffId: action.id, slot: null, step: 2 };
    case "date": return { ...state, date: action.date, slot: null };
    case "slot": return { ...state, slot: action.slot };
    case "customer": return { ...state, customer: action.customer, step: 4 };
    case "draft": return { ...state, customer: action.customer };
    case "reset": return { ...state, step: 0, serviceId: "", optionIds: [], staffId: "", date: action.date, slot: null, customer: { customerName: "", customerEmail: "", customerPhone: "" } };
    case "step": return { ...state, step: action.step };
    case "conflict": return { ...state, step: 2, slot: null };
  }
}
