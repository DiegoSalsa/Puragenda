export const SITE_URL = "https://www.puragenda.cl";

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
