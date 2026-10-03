// Server configuration only. Client components receive a boolean, never secrets.
export function publicWebsiteAcquisitionEnabled(env: Record<string, string | undefined> = process.env) {
  return env.WEBSITE_PUBLIC_ACQUISITION_ENABLED === "1" && env.WEBSITE_CHECKOUT_ENABLED === "1" &&
    !!env.MERCADOPAGO_ACCESS_TOKEN?.trim() && !!env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
}
