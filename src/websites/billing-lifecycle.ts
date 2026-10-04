type WebsiteBillingLifecycle = {
  status: string;
  mpSubscriptionId?: string | null;
  paddleSubscriptionId?: string | null;
  checkoutTransactionId?: string | null;
  validUntil?: Date | string | null;
  cancelAt?: Date | string | null;
  checkoutOperations?: readonly { state: string; mpSubscriptionId?: string | null }[];
};

// Billing evidence, not paid entitlement. An intent or an empty INACTIVE add-on
// is insufficient. Durable uncertain operations retain their reconciliation path.
export function hasExistingWebsiteBillingLifecycle(addon: WebsiteBillingLifecycle | null | undefined) {
  if (!addon) return false;
  return ["ACTIVE", "PAST_DUE"].includes(addon.status)
    || [addon.mpSubscriptionId, addon.paddleSubscriptionId, addon.checkoutTransactionId].some(id => !!id?.trim())
    || [addon.validUntil, addon.cancelAt].some(value => !!value && Number.isFinite(new Date(value).getTime()))
    || !!addon.checkoutOperations?.some(operation =>
      ["CREATING", "UNKNOWN", "PENDING", "AUTHORIZED"].includes(operation.state) || !!operation.mpSubscriptionId?.trim());
}
