import type { BellaConfig } from "./config";
import type { Catalog } from "./booking/types";
export type WebsiteView = { config: BellaConfig; catalog: Catalog; business: { id: string; name: string; logo: string | null; address: string | null; mapsUrl: string | null }; preview: boolean };
