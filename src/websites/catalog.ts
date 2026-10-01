import type { BookingCatalogDto } from "@/server/booking/contracts";
import type { Catalog } from "./templates/bella/_lib/puragenda/types";
export function websiteCatalog(data: BookingCatalogDto, preview = false): Catalog {
  return {
    mode: preview ? "preview" : "connected", business: data.business,
    services: data.services.map(item => ({ ...item, description: item.description ?? "", image: item.imageUrl ?? "", category: item.category?.name ?? "", categoryId: item.category?.id ?? "", categoryPosition: item.category?.position ?? Number.MAX_SAFE_INTEGER, optionCategories: item.optionCategories })),
    staff: data.staff.map(item => ({ ...item, image: item.imageUrl })),
    locations: data.locations, supportsAnyStaff: data.capabilities.firstAvailable,
    rules: { ...data.rules, maxDaysAhead: data.capabilities.maxDaysAhead },
  };
}
