export function getWidgetUrl(slug: string, env: Record<string, string | undefined> = process.env): string {
  const origin = env.APP_URL || env.NEXT_PUBLIC_APP_URL
    || (env.VERCEL_ENV === "preview" && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined)
    || (env.VERCEL_ENV === "preview" ? undefined
      : env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000");
  if (!origin) throw new Error("PREVIEW_WIDGET_ORIGIN_REQUIRED");
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || (env.VERCEL_ENV === "preview" && ["puragenda.cl", "www.puragenda.cl"].includes(url.hostname))) {
    throw new Error("INVALID_WIDGET_ORIGIN");
  }
  return new URL(`/widget/${encodeURIComponent(slug)}`, url.origin).href;
}
