/** Public option semantics, shared by quotes and the legacy booking writer. */
export type BookingOptionCategory = {
  id: string; name: string; isRequired: boolean; maxSelections: number;
  alternatives: Array<{ id: string; name: string; priceDelta: number; durationDelta: number; isHomeService: boolean }>;
};
export type QuotableService = {
  id: string; name: string; price: number; duration: number; optionCategories: BookingOptionCategory[];
};

export class BookingSelectionError extends Error {
  constructor(message: string, public code = "INVALID_SELECTION", public status = 400) { super(message); }
}

export function quoteBookingSelection(services: QuotableService[], optionIds: string[]) {
  const selected = new Set(optionIds);
  if (selected.size !== optionIds.length) throw new BookingSelectionError("Las opciones no pueden repetirse");
  const matched = new Set<string>();
  const serviceTotals = new Map<string, { duration: number; price: number }>();
  const selectedOptions = [] as Array<{
    serviceId: string; serviceName: string; categoryId: string; categoryName: string;
    alternativeId: string; alternativeName: string; priceDelta: number; durationDelta: number; isHomeService: boolean;
  }>;
  for (const service of services) {
    let price = service.price;
    let duration = service.duration;
    for (const category of service.optionCategories) {
      const alternatives = category.alternatives.filter((alt) => selected.has(alt.id));
      if (alternatives.length > category.maxSelections) throw new BookingSelectionError(`Puedes seleccionar hasta ${category.maxSelections} alternativa(s) para ${category.name}`);
      if (category.isRequired && !alternatives.length) throw new BookingSelectionError(`Debes seleccionar una alternativa para ${category.name}`);
      for (const alt of alternatives) {
        matched.add(alt.id);
        price += alt.priceDelta;
        duration += alt.durationDelta;
        selectedOptions.push({ serviceId: service.id, serviceName: service.name, categoryId: category.id, categoryName: category.name,
          alternativeId: alt.id, alternativeName: alt.name, priceDelta: alt.priceDelta, durationDelta: alt.durationDelta, isHomeService: alt.isHomeService });
      }
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0 || duration > 1440) throw new BookingSelectionError("La selección excede la duración o precio permitidos");
    serviceTotals.set(service.id, { price, duration });
  }
  if (matched.size !== selected.size) throw new BookingSelectionError("Una o mas opciones seleccionadas no son validas para estos servicios");
  return {
    price: [...serviceTotals.values()].reduce((sum, value) => sum + value.price, 0),
    duration: [...serviceTotals.values()].reduce((sum, value) => sum + value.duration, 0),
    requiresAddress: selectedOptions.some((option) => option.isHomeService), serviceTotals, selectedOptions,
  };
}
