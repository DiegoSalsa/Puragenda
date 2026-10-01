import type { Catalog } from "./booking/types";
export type WebsiteBusiness = { id: string; name: string; logo: string | null; address: string | null; mapsUrl: string | null };
export type WebsiteView<TConfig> = { config: TConfig; catalog: Catalog; business: WebsiteBusiness; preview: boolean };
