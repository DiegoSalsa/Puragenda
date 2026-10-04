type WebsiteBillingLifecycle = {
  status: string;
  mpSubscriptionId?: string | null;
  paddleSubscriptionId?: string | null;
  checkoutTransactionId?: string | null;
  validUntil?: Date | string | null;
  cancelAt?: Date | string | null;
  checkoutOperations?: readonly { state: string; mpSubscriptionId?: string | null }[];
};

// Manageable billing, not entitlement or history. Terminal IDs and cancellation
// dates alone cannot reopen acquisition; uncertain operations retain reconciliation.
export function hasExistingWebsiteBillingLifecycle(addon: WebsiteBillingLifecycle | null | undefined, now = new Date()) {
  if (!addon) return false;
  const mpAgreementId = addon.mpSubscriptionId?.trim();
  return ["ACTIVE", "PAST_DUE"].includes(addon.status)
    || !!addon.validUntil && new Date(addon.validUntil).getTime() > now.getTime()
    || !!addon.checkoutOperations?.some(operation =>
      ["CREATING", "UNKNOWN", "PENDING", "AUTHORIZED"].includes(operation.state))
    || addon.status !== "CANCELLED" && (
      [addon.paddleSubscriptionId, addon.checkoutTransactionId].some(id => !!id?.trim())
      || !!mpAgreementId && !addon.checkoutOperations?.some(operation =>
        operation.state === "CANCELLED" && operation.mpSubscriptionId?.trim() === mpAgreementId));
}
