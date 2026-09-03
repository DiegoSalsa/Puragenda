import { ADMIN_SECRET_PATH } from "@/core/constants";

export const GOOGLE_ANALYTICS_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export function getGoogleAnalyticsId(value = process.env.NEXT_PUBLIC_GA_ID) {
  const id = value?.trim() ?? "";
  return GOOGLE_ANALYTICS_ID_PATTERN.test(id) ? id : null;
}

export function isGoogleAnalyticsPath(pathname: string) {
  return !pathname.startsWith(ADMIN_SECRET_PATH);
}
