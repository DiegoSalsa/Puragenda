export interface CountryConfig {
  code: string;
  name: string;
  timezone: string;
  currency: string;
  locale: string;
  taxIdLabel: string;
  taxIdPlaceholder: string;
  mercadoPagoSiteId: string | null;
}

// Practical defaults for the markets Puragenda is most likely to onboard first.
// Any other ISO country is still accepted and can provide its own timezone/currency.
export const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  CL: { code: "CL", name: "Chile", timezone: "America/Santiago", currency: "CLP", locale: "es-CL", taxIdLabel: "RUT", taxIdPlaceholder: "12345678-9", mercadoPagoSiteId: "MLC" },
  AR: { code: "AR", name: "Argentina", timezone: "America/Argentina/Buenos_Aires", currency: "ARS", locale: "es-AR", taxIdLabel: "DNI / CUIT", taxIdPlaceholder: "DNI o CUIT", mercadoPagoSiteId: "MLA" },
  BR: { code: "BR", name: "Brasil", timezone: "America/Sao_Paulo", currency: "BRL", locale: "pt-BR", taxIdLabel: "CPF / CNPJ", taxIdPlaceholder: "CPF o CNPJ", mercadoPagoSiteId: "MLB" },
  CO: { code: "CO", name: "Colombia", timezone: "America/Bogota", currency: "COP", locale: "es-CO", taxIdLabel: "CC / NIT", taxIdPlaceholder: "CC o NIT", mercadoPagoSiteId: "MCO" },
  MX: { code: "MX", name: "México", timezone: "America/Mexico_City", currency: "MXN", locale: "es-MX", taxIdLabel: "RFC", taxIdPlaceholder: "RFC", mercadoPagoSiteId: "MLM" },
  PE: { code: "PE", name: "Perú", timezone: "America/Lima", currency: "PEN", locale: "es-PE", taxIdLabel: "DNI / RUC", taxIdPlaceholder: "DNI o RUC", mercadoPagoSiteId: "MPE" },
  UY: { code: "UY", name: "Uruguay", timezone: "America/Montevideo", currency: "UYU", locale: "es-UY", taxIdLabel: "CI / RUT", taxIdPlaceholder: "CI o RUT", mercadoPagoSiteId: "MLU" },
  BO: { code: "BO", name: "Bolivia", timezone: "America/La_Paz", currency: "BOB", locale: "es-BO", taxIdLabel: "CI / NIT", taxIdPlaceholder: "CI o NIT", mercadoPagoSiteId: null },
  CA: { code: "CA", name: "Canadá", timezone: "America/Toronto", currency: "CAD", locale: "es-CA", taxIdLabel: "Identificación fiscal", taxIdPlaceholder: "Identificación fiscal", mercadoPagoSiteId: null },
  CR: { code: "CR", name: "Costa Rica", timezone: "America/Costa_Rica", currency: "CRC", locale: "es-CR", taxIdLabel: "Cédula", taxIdPlaceholder: "Cédula", mercadoPagoSiteId: null },
  DO: { code: "DO", name: "República Dominicana", timezone: "America/Santo_Domingo", currency: "DOP", locale: "es-DO", taxIdLabel: "Cédula / RNC", taxIdPlaceholder: "Cédula o RNC", mercadoPagoSiteId: null },
  EC: { code: "EC", name: "Ecuador", timezone: "America/Guayaquil", currency: "USD", locale: "es-EC", taxIdLabel: "Cédula / RUC", taxIdPlaceholder: "Cédula o RUC", mercadoPagoSiteId: null },
  ES: { code: "ES", name: "España", timezone: "Europe/Madrid", currency: "EUR", locale: "es-ES", taxIdLabel: "DNI / NIE / CIF", taxIdPlaceholder: "DNI, NIE o CIF", mercadoPagoSiteId: null },
  GT: { code: "GT", name: "Guatemala", timezone: "America/Guatemala", currency: "GTQ", locale: "es-GT", taxIdLabel: "DPI / NIT", taxIdPlaceholder: "DPI o NIT", mercadoPagoSiteId: null },
  HN: { code: "HN", name: "Honduras", timezone: "America/Tegucigalpa", currency: "HNL", locale: "es-HN", taxIdLabel: "Identificación fiscal", taxIdPlaceholder: "Identificación fiscal", mercadoPagoSiteId: null },
  NI: { code: "NI", name: "Nicaragua", timezone: "America/Managua", currency: "NIO", locale: "es-NI", taxIdLabel: "Cédula / RUC", taxIdPlaceholder: "Cédula o RUC", mercadoPagoSiteId: null },
  PA: { code: "PA", name: "Panamá", timezone: "America/Panama", currency: "PAB", locale: "es-PA", taxIdLabel: "Cédula / RUC", taxIdPlaceholder: "Cédula o RUC", mercadoPagoSiteId: null },
  PY: { code: "PY", name: "Paraguay", timezone: "America/Asuncion", currency: "PYG", locale: "es-PY", taxIdLabel: "CI / RUC", taxIdPlaceholder: "CI o RUC", mercadoPagoSiteId: null },
  SV: { code: "SV", name: "El Salvador", timezone: "America/El_Salvador", currency: "USD", locale: "es-SV", taxIdLabel: "DUI / NIT", taxIdPlaceholder: "DUI o NIT", mercadoPagoSiteId: null },
  US: { code: "US", name: "Estados Unidos", timezone: "America/New_York", currency: "USD", locale: "es-US", taxIdLabel: "Identificación fiscal", taxIdPlaceholder: "Identificación fiscal", mercadoPagoSiteId: null },
  VE: { code: "VE", name: "Venezuela", timezone: "America/Caracas", currency: "VES", locale: "es-VE", taxIdLabel: "Cédula / RIF", taxIdPlaceholder: "Cédula o RIF", mercadoPagoSiteId: null },
};

export const ISO_COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(" ");

export type SupportedCountryCode = string;
export type SupportedCurrencyCode = string;
export const DEFAULT_COUNTRY_CODE = "CL";

const countryCodeSet = new Set(ISO_COUNTRY_CODES);

export const MERCADO_PAGO_COUNTRY_CODES = Object.values(COUNTRY_CONFIG)
  .filter((country) => country.mercadoPagoSiteId)
  .map((country) => country.code);

export function isSupportedCountryCode(value: string): boolean {
  return countryCodeSet.has(value.toUpperCase());
}

export function isMercadoPagoCountryCode(value: string): boolean {
  return MERCADO_PAGO_COUNTRY_CODES.includes(value.toUpperCase());
}

export function getMercadoPagoCurrency(countryCode: string | null | undefined): string | null {
  const country = getCountryConfig(countryCode);
  return country.mercadoPagoSiteId ? country.currency : null;
}

export function isMercadoPagoCurrencyCompatible(
  countryCode: string | null | undefined,
  currencyCode: string | null | undefined,
): boolean {
  const expectedCurrency = getMercadoPagoCurrency(countryCode);
  return expectedCurrency !== null && expectedCurrency === currencyCode?.trim().toUpperCase();
}

export function getCountryName(code: string, locale = "es") {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

export function getCountryOptions(locale = "es") {
  return ISO_COUNTRY_CODES.map((code) => ({
    code,
    name: COUNTRY_CONFIG[code]?.name ?? getCountryName(code, locale),
  }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

export function getCountryConfig(value: string | null | undefined): CountryConfig {
  const normalized = value?.toUpperCase() || DEFAULT_COUNTRY_CODE;
  if (COUNTRY_CONFIG[normalized]) return COUNTRY_CONFIG[normalized];
  if (!isSupportedCountryCode(normalized)) return COUNTRY_CONFIG[DEFAULT_COUNTRY_CODE];
  return {
    code: normalized,
    name: getCountryName(normalized),
    timezone: "UTC",
    currency: "USD",
    locale: "es",
    taxIdLabel: "Identificación fiscal",
    taxIdPlaceholder: "Documento fiscal",
    mercadoPagoSiteId: null,
  };
}

export function getLocaleForCurrency(currency: string | null | undefined) {
  const region = Object.values(COUNTRY_CONFIG).find((item) => item.currency === currency);
  return region?.locale ?? "es";
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimezones() {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  return intl.supportedValuesOf?.("timeZone") ?? ["UTC", ...Object.values(COUNTRY_CONFIG).map((country) => country.timezone)];
}

const COUNTRY_TIMEZONES: Record<string, string[]> = {
  CL: ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"],
  MX: ["America/Mexico_City", "America/Cancun", "America/Chihuahua", "America/Mazatlan", "America/Hermosillo", "America/Tijuana"],
  AR: ["America/Argentina/Buenos_Aires", "America/Argentina/Cordoba", "America/Argentina/Mendoza", "America/Argentina/Salta"],
  BR: ["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco", "America/Belem", "America/Noronha"],
  CA: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns"],
  US: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"],
  ES: ["Europe/Madrid", "Atlantic/Canary"],
  EC: ["America/Guayaquil", "Pacific/Galapagos"],
};

const TIMEZONE_LABELS: Record<string, string> = {
  "America/Santiago": "Chile continental — Santiago",
  "America/Punta_Arenas": "Chile — Magallanes / Punta Arenas",
  "Pacific/Easter": "Chile — Isla de Pascua / Rapa Nui",
  "America/Mexico_City": "México — Ciudad de México",
  "America/Cancun": "México — Cancún / Quintana Roo",
  "America/Chihuahua": "México — Chihuahua",
  "America/Mazatlan": "México — Mazatlán / Sinaloa",
  "America/Hermosillo": "México — Hermosillo / Sonora",
  "America/Tijuana": "México — Tijuana / Baja California",
};

function timezoneLabel(timezone: string) {
  return TIMEZONE_LABELS[timezone] ?? timezone.replaceAll("_", " ").replaceAll("/", " — ");
}

export function getTimezoneOptions(countryCode?: string | null) {
  const preferred = COUNTRY_TIMEZONES[countryCode?.toUpperCase() || ""] ?? [];
  const timezones = [...new Set([...preferred, ...getSupportedTimezones()])];
  return timezones.map((value) => ({ value, label: timezoneLabel(value), preferred: preferred.includes(value) }));
}

const FALLBACK_CURRENCIES = ["ARS", "BOB", "BRL", "CAD", "CLP", "COP", "CRC", "DOP", "EUR", "GTQ", "HNL", "MXN", "NIO", "PAB", "PEN", "PYG", "USD", "UYU", "VES"];

export function getCurrencyOptions(locale = "es") {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "currency") => string[] };
  const values = intl.supportedValuesOf?.("currency") ?? FALLBACK_CURRENCIES;
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: "currency" });
  } catch {
    displayNames = null;
  }
  return values.map((value) => ({ value, label: `${value} — ${displayNames?.of(value) ?? value}` }));
}

export function normalizeAndValidateTaxId(countryCode: string | null | undefined, value: string) {
  const region = getCountryConfig(countryCode);
  const trimmed = value.trim();
  if (!trimmed) return { value: "" };

  if (region.code === "CL") {
    const normalized = trimmed.replace(/\./g, "").toUpperCase();
    if (!/^\d{7,8}-[\dK]$/.test(normalized)) {
      return { error: "Formato de RUT inválido. Usa el formato 12345678-9" };
    }
    return { value: normalized };
  }

  if (region.code === "AR") {
    const digits = trimmed.replace(/[.\s-]/g, "");
    if (!/^\d{7,8}$/.test(digits) && !/^\d{11}$/.test(digits)) {
      return { error: "Ingresa un DNI de 7 u 8 dígitos o un CUIT de 11 dígitos" };
    }
    return { value: digits };
  }

  return { value: trimmed };
}
