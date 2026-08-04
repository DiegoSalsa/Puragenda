import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLocaleForCurrency } from "@/core/countries";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a business price in its configured currency.
 */
export function formatPrice(price: number, currency: string = "CLP"): string {
  return new Intl.NumberFormat(getLocaleForCurrency(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
