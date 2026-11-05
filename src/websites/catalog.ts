import type { BookingCatalogDto } from "@/server/booking/contracts";
import type { Catalog } from "./booking/types";
import { safeLink, safeMediaUrl } from "./shared-config";
export function websiteCatalog(data: BookingCatalogDto, preview = false): Catalog {
  return {
    mode: preview ? "preview" : "connected", business: data.business,
    services: data.services.map(item => ({ ...item, imageUrl: item.imageUrl && safeMediaUrl(item.imageUrl) ? item.imageUrl : null, description: item.description ?? "", image: item.imageUrl && safeMediaUrl(item.imageUrl) ? item.imageUrl : "", category: item.category?.name ?? "", categoryId: item.category?.id ?? "", categoryPosition: item.category?.position ?? Number.MAX_SAFE_INTEGER, optionCategories: item.optionCategories })),
    staff: data.staff.map(item => ({ ...item, imageUrl: item.imageUrl && safeMediaUrl(item.imageUrl) ? item.imageUrl : null, image: item.imageUrl && safeMediaUrl(item.imageUrl) ? item.imageUrl : null })),
    locations: data.locations.map(item => ({...item, mapsUrl: item.mapsUrl && safeLink(item.mapsUrl) ? item.mapsUrl : null})), supportsAnyStaff: data.capabilities.firstAvailable,
    rules: { ...data.rules, maxDaysAhead: data.capabilities.maxDaysAhead },
  };
}
