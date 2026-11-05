export type DepositPaymentStatus = "CHECK_AT_BOOKING" | "UNAVAILABLE";
export const DEPOSIT_UNAVAILABLE_MESSAGE = "El abono obligatorio no está disponible temporalmente. Contacta al negocio o intenta más tarde.";

// Configuration can prove unavailability, but a live authorization is checked
// only when booking. Catalog reads never refresh credentials or call a provider.
export function depositPaymentStatus(config: {
  depositPaymentMode: string; mpAccessToken?: string | null;
  mpRefreshToken?: string | null; mpTokenExpiresAt?: Date | null;
}, service?: { depositPaymentUrl?: string | null }, now = new Date()): DepositPaymentStatus {
  if (config.depositPaymentMode === "MANUAL_LINK") return service && !service.depositPaymentUrl ? "UNAVAILABLE" : "CHECK_AT_BOOKING";
  if (!config.mpAccessToken) return "UNAVAILABLE";
  if (config.mpTokenExpiresAt && config.mpTokenExpiresAt.getTime() <= now.getTime() + 5 * 60_000 && !config.mpRefreshToken) return "UNAVAILABLE";
  return "CHECK_AT_BOOKING";
}

export function selectedDepositUnavailable(enabled: boolean, services: Array<{ depositAmount?: number; depositPaymentStatus?: DepositPaymentStatus }>, totalPrice: number) {
  return enabled && totalPrice > 0 && services.some(service => (service.depositAmount ?? 0) > 0 && service.depositPaymentStatus === "UNAVAILABLE");
}
