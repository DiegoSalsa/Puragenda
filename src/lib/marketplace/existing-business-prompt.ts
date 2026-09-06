import { marketplaceConsentState } from "./authorization";
import { MARKETPLACE_EXCLUDED_SLUGS } from "./visibility";
import { isMarketplaceSubscriptionActive } from "./publication";

// Commit ed3e91f introduced marketplace-ready registration. Newer businesses
// already saw that decision in registration and must not receive this legacy prompt.
export const MARKETPLACE_READY_REGISTRATION_CUTOFF = new Date("2026-09-06T21:17:30.000Z");

export type ExistingBusinessMarketplacePromptEligibility = {
  createdAt: Date;
  deletedAt: Date | null;
  slug: string;
  plan: string | null;
  subscriptionStatus: string | null;
  promptDismissedAt: Date | null;
  hasActivePrimaryLocation: boolean;
  listings: ReadonlyArray<{
    authorizationConfirmedAt: Date | null;
    authorizationRevokedAt: Date | null;
  }>;
};

export function shouldShowExistingBusinessMarketplacePrompt(
  input: ExistingBusinessMarketplacePromptEligibility,
): boolean {
  if (input.createdAt >= MARKETPLACE_READY_REGISTRATION_CUTOFF) return false;
  if (input.deletedAt != null) return false;
  if (MARKETPLACE_EXCLUDED_SLUGS.has(input.slug)) return false;
  if (input.plan === "TEST") return false;
  if (!isMarketplaceSubscriptionActive(input.subscriptionStatus)) return false;
  if (!input.hasActivePrimaryLocation) return false;
  return marketplaceConsentState({
    promptDismissedAt: input.promptDismissedAt,
    listings: input.listings,
  }) === "UNANSWERED";
}
