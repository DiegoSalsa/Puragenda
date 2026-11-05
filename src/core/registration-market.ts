import { z } from "zod";

// New-business onboarding only. Existing businesses keep their regional settings.
export const REGISTRATION_COUNTRY = "CL";
export const REGISTRATION_CURRENCY = "CLP";
export const REGISTRATION_TIMEZONES = [
  "America/Santiago",
  "America/Coyhaique",
  "America/Punta_Arenas",
  "Pacific/Easter",
] as const;

export const registrationMarketSchema = z.object({
  countryCode: z.string().trim().toUpperCase().default(REGISTRATION_COUNTRY)
    .refine(value => value === REGISTRATION_COUNTRY, "Actualmente el registro está disponible solo para negocios en Chile"),
  currencyCode: z.string().trim().toUpperCase().default(REGISTRATION_CURRENCY)
    .refine(value => value === REGISTRATION_CURRENCY, "Los nuevos negocios deben utilizar CLP"),
  timezone: z.enum(REGISTRATION_TIMEZONES, { error: "Selecciona una zona horaria de Chile" }).default("America/Santiago"),
});
