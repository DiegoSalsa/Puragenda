-- Non-Prisma objects for tables actually represented by the baseline schema.

ALTER TABLE "WidgetTheme" ADD CONSTRAINT "WidgetTheme_fontSize_check" CHECK ("fontSize" BETWEEN 10 AND 24);

ALTER TABLE "WidgetTheme" ADD CONSTRAINT "WidgetTheme_cornerRadius_check" CHECK ("cornerRadius" BETWEEN 0 AND 40);

ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_position_check" CHECK ("position" >= 0);

ALTER TABLE "Service" ADD CONSTRAINT "Service_weeklyProductionCapacity_check" CHECK ("weeklyProductionCapacity" BETWEEN 1 AND 100);

ALTER TABLE "Service" ADD CONSTRAINT "Service_productionWeeksAhead_check" CHECK ("productionWeeksAhead" BETWEEN 1 AND 104);

ALTER TABLE "Service" ADD CONSTRAINT "Service_productionDepositPercent_check" CHECK ("productionDepositPercent" BETWEEN 0 AND 100);

ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_amounts_check" CHECK ("totalPrice" >= 0 AND "depositAmount" >= 0 AND "balanceAmount" >= 0);

ALTER TABLE "Service" ADD CONSTRAINT "Service_productionLeadTimeWeeks_check" CHECK ("productionLeadTimeWeeks" BETWEEN 0 AND 104);

ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_position_check" CHECK ("position" >= 0);

ALTER TABLE "Business" ADD CONSTRAINT "Business_widgetShadowStyle_check" CHECK ("widgetShadowStyle" IN ('none', 'soft', 'strong'));

ALTER TABLE "Business" ADD CONSTRAINT "Business_widgetHeaderAlign_check" CHECK ("widgetHeaderAlign" IN ('left', 'center', 'right'));

ALTER TABLE "WidgetTheme" ADD CONSTRAINT "WidgetTheme_shadowStyle_check" CHECK ("shadowStyle" IN ('none', 'soft', 'strong'));

ALTER TABLE "WidgetTheme" ADD CONSTRAINT "WidgetTheme_headerAlign_check" CHECK ("headerAlign" IN ('left', 'center', 'right'));

ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_textAlign_check" CHECK ("textAlign" IN ('left', 'center', 'right'));

ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_discount_config_check" CHECK (
  ("discountType" IS NULL AND "discountValue" IS NULL)
  OR (
    "discountType" IN ('PERCENTAGE', 'FIXED')
    AND "discountValue" > 0
    AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100)
  )
);

ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_discount_dates_check" CHECK (
  "discountStartsAt" IS NULL
  OR "discountEndsAt" IS NULL
  OR "discountStartsAt" < "discountEndsAt"
);

ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_discount_min_subtotal_check" CHECK ("discountMinSubtotal" >= 0);

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customer_action_token_expiry_check" CHECK (
  "customerActionTokenExpiresAt" IS NULL
  OR "customerActionTokenExpiresAt" > "createdAt"
);

ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_priority_release_check" CHECK (
  ("type" = 'UNAVAILABLE' AND "releaseAt" IS NULL)
  OR (
    "type" = 'PRIORITY'
    AND ("releaseAt" IS NULL OR "releaseAt" < "startTime")
  )
);

ALTER TABLE "Business" ADD CONSTRAINT "Business_countryCode_check" CHECK ("countryCode" ~ '^[A-Z]{2}$');

ALTER TABLE "Business" ADD CONSTRAINT "Business_currencyCode_check" CHECK ("currencyCode" ~ '^[A-Z]{3}$');

ALTER TABLE "Business" ADD CONSTRAINT "Business_locale_check" CHECK ("locale" IN ('es', 'en', 'it', 'pt', 'fr', 'de', 'zh-CN'));

ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_status_check" CHECK ("status" IN ('PUBLISHED', 'ARCHIVED'));

ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_objective_check" CHECK ("objective" IN ('FILL_SLOTS', 'LAST_MINUTE', 'PROMOTE_SERVICE', 'CANCELLATION'));

ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "BookingDiscountCode" ADD CONSTRAINT "BookingDiscountCode_code_check" CHECK ("code" ~ '^[A-Z0-9]([A-Z0-9_-]{0,48}[A-Z0-9])?$');

ALTER TABLE "BookingDiscountCode" ADD CONSTRAINT "BookingDiscountCode_value_check" CHECK (
    "discountValue" > 0
    AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100)
  );

ALTER TABLE "BookingDiscountCode" ADD CONSTRAINT "BookingDiscountCode_minSubtotal_check" CHECK ("minSubtotal" >= 0);

ALTER TABLE "BookingDiscountCode" ADD CONSTRAINT "BookingDiscountCode_dates_check" CHECK (
    "startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt"
  );

ALTER TABLE "TrackingConsent" ADD CONSTRAINT "TrackingConsent_decision_check" CHECK ("decision" IN ('accepted', 'rejected'));

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_requestType_check" CHECK ("requestType" IN ('ACCESS', 'RECTIFICATION', 'SUPPRESSION', 'OPPOSITION', 'PORTABILITY', 'BLOCKING'));

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_status_check" CHECK ("status" IN ('RECEIVED', 'IN_REVIEW', 'FULFILLED', 'DENIED'));

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_identityStatus_check" CHECK ("identityStatus" IN ('PENDING', 'VERIFIED'));

ALTER TABLE "Business" ADD CONSTRAINT "Business_loyaltyRewardExpirationDays_check" CHECK ("loyaltyRewardExpirationDays" IS NULL OR "loyaltyRewardExpirationDays" IN (30, 60, 90));

ALTER TABLE "LoyaltyStampEvent" ADD CONSTRAINT "LoyaltyStampEvent_delta_check" CHECK ("delta" <> 0);

ALTER TABLE "GiftCardTemplate" ADD CONSTRAINT "GiftCardTemplate_salePrice_check" CHECK ("salePrice" > 0);

ALTER TABLE "GiftCardTemplate" ADD CONSTRAINT "GiftCardTemplate_faceValue_check" CHECK (("type" = 'BALANCE' AND "faceValue" > 0) OR ("type" = 'SERVICE' AND "faceValue" IS NULL));

ALTER TABLE "GiftCardTemplateService" ADD CONSTRAINT "GiftCardTemplateService_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_salePrice_check" CHECK ("salePrice" > 0);

ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_gift_delivery_check" CHECK (
    ("deliveryMode" = 'SELF') OR
    ("deliveryMode" = 'GIFT' AND "recipientName" IS NOT NULL AND "recipientEmail" IS NOT NULL AND "senderName" IS NOT NULL)
  );

ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_balance_check" CHECK (
    ("type" = 'BALANCE' AND "initialBalance" >= 0 AND "remainingBalance" >= 0 AND "remainingBalance" <= "initialBalance") OR
    ("type" = 'SERVICE' AND "initialBalance" IS NULL AND "remainingBalance" IS NULL)
  );

ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_quantity_check" CHECK ("quantityInitial" > 0 AND "quantityRemaining" >= 0 AND "quantityRemaining" <= "quantityInitial");

ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_value_check" CHECK ("unitValueSnapshot" >= 0);

ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_amount_check" CHECK ("amountCovered" >= 0);

ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_amount_check" CHECK ("amountCovered" >= 0);

ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "website_published_snapshot" CHECK ("status" <> 'PUBLISHED' OR ("publishedConfig" IS NOT NULL AND "publishedAt" IS NOT NULL));

ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "website_subdomain_format" CHECK ("subdomain" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "website_domain_lowercase" CHECK ("hostname" = lower("hostname"));

ALTER TABLE "WebsitePurchaseIntent" ADD CONSTRAINT "WebsitePurchaseIntent_baseState_check" CHECK ("baseState" IN ('NONE','CREATING','PENDING','UNKNOWN','ACTIVE','CANCELLED'));

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_staffLimitOverride_positive" CHECK ("staffLimitOverride" IS NULL OR "staffLimitOverride" > 0);

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customMonthlyPriceClp_positive" CHECK ("customMonthlyPriceClp" IS NULL OR "customMonthlyPriceClp" > 0);

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customMonthlyPriceClp_manual_monthly" CHECK ("customMonthlyPriceClp" IS NULL OR ("paymentMethod" = 'BANK_TRANSFER' AND "billingCycle" = 'MONTHLY'));

ALTER TABLE "McpRolloutState" ADD CONSTRAINT "McpRolloutState_singleton" CHECK ("id" = 'global');

ALTER TABLE "McpRolloutState" ADD CONSTRAINT "McpRolloutState_approval_required" CHECK (
    NOT "businessAccessEnabled" OR ("approvedAt" IS NOT NULL AND length(trim("approvalReference")) > 0 AND "approvalReference" IS NOT NULL)
  );

CREATE UNIQUE INDEX "BusinessLocation_one_primary_per_business" ON "BusinessLocation"("businessId") WHERE "isPrimary";

CREATE UNIQUE INDEX "PosPayment_one_active_per_appointment_idx"
  ON "PosPayment"("appointmentId")
  WHERE "status" IN ('CREATING', 'PENDING');

CREATE UNIQUE INDEX "WebsiteDomain_one_primary" ON "WebsiteDomain" ("websiteId") WHERE "isPrimary";

CREATE OR REPLACE FUNCTION puragenda_guard_appointment_capacity() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE business_only boolean;
BEGIN
  IF NEW."status" = 'CANCELLED' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking-capacity:' || NEW."businessId", 0));
  SELECT COALESCE((SELECT "plan" = 'INDIVIDUAL' FROM "Subscription" WHERE "businessId" = NEW."businessId"), true)
    INTO business_only;
  IF EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."businessId" = NEW."businessId" AND a."id" <> NEW."id" AND a."status" <> 'CANCELLED'
      AND a."startTime" < NEW."endTime" AND a."endTime" > NEW."startTime"
      AND (
        ((business_only OR NEW."staffId" IS NULL) AND (a."locationId" = NEW."locationId" OR a."locationId" IS NULL OR NEW."locationId" IS NULL))
        OR (NOT business_only AND NEW."staffId" IS NOT NULL AND (
          a."staffId" = NEW."staffId" OR (a."staffId" IS NULL AND (a."locationId" = NEW."locationId" OR a."locationId" IS NULL OR NEW."locationId" IS NULL))
        ))
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'BOOKING_SLOT_CONFLICT';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Appointment_capacity_guard"
BEFORE INSERT OR UPDATE OF "businessId", "locationId", "staffId", "startTime", "endTime", "status"
ON "Appointment" FOR EACH ROW EXECUTE FUNCTION puragenda_guard_appointment_capacity();


ALTER TABLE "AccessProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AccessProfile" FROM PUBLIC;

ALTER TABLE "AdminInteractiveCampaign" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminInteractiveCampaign" FROM PUBLIC;

ALTER TABLE "AdminInteractiveRecipient" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminInteractiveRecipient" FROM PUBLIC;

ALTER TABLE "AdminInteractiveResponse" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminInteractiveResponse" FROM PUBLIC;

ALTER TABLE "AdminLoginCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminLoginCode" FROM PUBLIC;

ALTER TABLE "ApiRateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApiRateLimitBucket" FROM PUBLIC;

ALTER TABLE "BookingDiscountCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingDiscountCode" FROM PUBLIC;

ALTER TABLE "BookingFeedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingFeedback" FROM PUBLIC;

ALTER TABLE "BookingOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingOperation" FROM PUBLIC;

ALTER TABLE "BusinessLocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessLocation" FROM PUBLIC;

ALTER TABLE "BusinessScheduleOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessScheduleOverride" FROM PUBLIC;

ALTER TABLE "BusinessWebsite" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessWebsite" FROM PUBLIC;

ALTER TABLE "ClientPortalAccount" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ClientPortalAccount" FROM PUBLIC;

ALTER TABLE "ClientPortalSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ClientPortalSession" FROM PUBLIC;

ALTER TABLE "ClientPortalToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ClientPortalToken" FROM PUBLIC;

ALTER TABLE "DepositPaymentDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DepositPaymentDelivery" FROM PUBLIC;

ALTER TABLE "DomainRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DomainRequest" FROM PUBLIC;

ALTER TABLE "GiftCard" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCard" FROM PUBLIC;

ALTER TABLE "GiftCardPurchase" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardPurchase" FROM PUBLIC;

ALTER TABLE "GiftCardRedemption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardRedemption" FROM PUBLIC;

ALTER TABLE "GiftCardRedemptionItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardRedemptionItem" FROM PUBLIC;

ALTER TABLE "GiftCardServiceEntitlement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardServiceEntitlement" FROM PUBLIC;

ALTER TABLE "GiftCardTemplate" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardTemplate" FROM PUBLIC;

ALTER TABLE "GiftCardTemplateService" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardTemplateService" FROM PUBLIC;

ALTER TABLE "GiftCardTransaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GiftCardTransaction" FROM PUBLIC;

ALTER TABLE "GoogleCalendarConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GoogleCalendarConnection" FROM PUBLIC;

ALTER TABLE "GoogleCalendarEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GoogleCalendarEvent" FROM PUBLIC;

ALTER TABLE "LocationHours" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LocationHours" FROM PUBLIC;

ALTER TABLE "LocationScheduleOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LocationScheduleOverride" FROM PUBLIC;

ALTER TABLE "LocationService" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LocationService" FROM PUBLIC;

ALTER TABLE "LoyaltyStampEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LoyaltyStampEvent" FROM PUBLIC;

ALTER TABLE "MarketplaceCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MarketplaceCategory" FROM PUBLIC;

ALTER TABLE "MarketplaceListing" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MarketplaceListing" FROM PUBLIC;

ALTER TABLE "MarketplaceListingCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MarketplaceListingCategory" FROM PUBLIC;

ALTER TABLE "MarketplaceLocality" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "MarketplaceLocality" FROM PUBLIC;

ALTER TABLE "McpConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpConnection" FROM PUBLIC;

ALTER TABLE "McpOAuthClient" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthClient" FROM PUBLIC;

ALTER TABLE "McpOAuthCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthCode" FROM PUBLIC;

ALTER TABLE "McpOAuthRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthRequest" FROM PUBLIC;

ALTER TABLE "McpOAuthToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthToken" FROM PUBLIC;

ALTER TABLE "McpOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOperation" FROM PUBLIC;

ALTER TABLE "McpProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpProfile" FROM PUBLIC;

ALTER TABLE "McpRolloutState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpRolloutState" FROM PUBLIC;

ALTER TABLE "PlatformDiscountCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PlatformDiscountCode" FROM PUBLIC;

ALTER TABLE "PlatformDiscountRedemption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PlatformDiscountRedemption" FROM PUBLIC;

ALTER TABLE "PosPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PosPayment" FROM PUBLIC;

ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PrivacyRequest" FROM PUBLIC;

ALTER TABLE "PrivacyRestriction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PrivacyRestriction" FROM PUBLIC;

ALTER TABLE "ProductionOrder" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProductionOrder" FROM PUBLIC;

ALTER TABLE "PuriFeedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PuriFeedback" FROM PUBLIC;

ALTER TABLE "PuriRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PuriRequest" FROM PUBLIC;

ALTER TABLE "PuriToolCall" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PuriToolCall" FROM PUBLIC;

ALTER TABLE "PuriUiEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PuriUiEvent" FROM PUBLIC;

ALTER TABLE "ServiceCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ServiceCategory" FROM PUBLIC;

ALTER TABLE "ServiceOptionAlternative" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ServiceOptionAlternative" FROM PUBLIC;

ALTER TABLE "ServiceOptionCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ServiceOptionCategory" FROM PUBLIC;

ALTER TABLE "StaffLocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffLocation" FROM PUBLIC;

ALTER TABLE "StaffLocationSchedule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffLocationSchedule" FROM PUBLIC;

ALTER TABLE "StaffScheduleOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffScheduleOverride" FROM PUBLIC;

ALTER TABLE "StoryCampaign" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StoryCampaign" FROM PUBLIC;

ALTER TABLE "StoryPreset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StoryPreset" FROM PUBLIC;

ALTER TABLE "SubscriptionPaymentNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SubscriptionPaymentNotification" FROM PUBLIC;

ALTER TABLE "SuperAdminSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SuperAdminSession" FROM PUBLIC;

ALTER TABLE "TrackingConsent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TrackingConsent" FROM PUBLIC;

ALTER TABLE "TrackingEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TrackingEvent" FROM PUBLIC;

ALTER TABLE "WebsiteAddon" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteAddon" FROM PUBLIC;

ALTER TABLE "WebsiteBillingEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteBillingEvent" FROM PUBLIC;

ALTER TABLE "WebsiteCheckoutOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteCheckoutOperation" FROM PUBLIC;

ALTER TABLE "WebsiteCommercialEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteCommercialEvent" FROM PUBLIC;

ALTER TABLE "WebsiteDomain" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteDomain" FROM PUBLIC;

ALTER TABLE "WebsiteLaunchSnapshot" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteLaunchSnapshot" FROM PUBLIC;

ALTER TABLE "WebsiteMedia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteMedia" FROM PUBLIC;

ALTER TABLE "WebsiteOfferEligibility" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteOfferEligibility" FROM PUBLIC;

ALTER TABLE "WebsitePurchaseIntent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsitePurchaseIntent" FROM PUBLIC;

ALTER TABLE "WidgetPromoBlock" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WidgetPromoBlock" FROM PUBLIC;

ALTER TABLE "WidgetTheme" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WidgetTheme" FROM PUBLIC;

DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
 REVOKE ALL ON TABLE "AccessProfile", "AdminInteractiveCampaign", "AdminInteractiveRecipient", "AdminInteractiveResponse", "AdminLoginCode", "ApiRateLimitBucket", "BookingDiscountCode", "BookingFeedback", "BookingOperation", "BusinessLocation", "BusinessScheduleOverride", "BusinessWebsite", "ClientPortalAccount", "ClientPortalSession", "ClientPortalToken", "DepositPaymentDelivery", "DomainRequest", "GiftCard", "GiftCardPurchase", "GiftCardRedemption", "GiftCardRedemptionItem", "GiftCardServiceEntitlement", "GiftCardTemplate", "GiftCardTemplateService", "GiftCardTransaction", "GoogleCalendarConnection", "GoogleCalendarEvent", "LocationHours", "LocationScheduleOverride", "LocationService", "LoyaltyStampEvent", "MarketplaceCategory", "MarketplaceListing", "MarketplaceListingCategory", "MarketplaceLocality", "McpConnection", "McpOAuthClient", "McpOAuthCode", "McpOAuthRequest", "McpOAuthToken", "McpOperation", "McpProfile", "McpRolloutState", "PlatformDiscountCode", "PlatformDiscountRedemption", "PosPayment", "PrivacyRequest", "PrivacyRestriction", "ProductionOrder", "PuriFeedback", "PuriRequest", "PuriToolCall", "PuriUiEvent", "ServiceCategory", "ServiceOptionAlternative", "ServiceOptionCategory", "StaffLocation", "StaffLocationSchedule", "StaffScheduleOverride", "StoryCampaign", "StoryPreset", "SubscriptionPaymentNotification", "SuperAdminSession", "TrackingConsent", "TrackingEvent", "WebsiteAddon", "WebsiteBillingEvent", "WebsiteCheckoutOperation", "WebsiteCommercialEvent", "WebsiteDomain", "WebsiteLaunchSnapshot", "WebsiteMedia", "WebsiteOfferEligibility", "WebsitePurchaseIntent", "WidgetPromoBlock", "WidgetTheme" FROM anon; END IF;
IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
 REVOKE ALL ON TABLE "AccessProfile", "AdminInteractiveCampaign", "AdminInteractiveRecipient", "AdminInteractiveResponse", "AdminLoginCode", "ApiRateLimitBucket", "BookingDiscountCode", "BookingFeedback", "BookingOperation", "BusinessLocation", "BusinessScheduleOverride", "BusinessWebsite", "ClientPortalAccount", "ClientPortalSession", "ClientPortalToken", "DepositPaymentDelivery", "DomainRequest", "GiftCard", "GiftCardPurchase", "GiftCardRedemption", "GiftCardRedemptionItem", "GiftCardServiceEntitlement", "GiftCardTemplate", "GiftCardTemplateService", "GiftCardTransaction", "GoogleCalendarConnection", "GoogleCalendarEvent", "LocationHours", "LocationScheduleOverride", "LocationService", "LoyaltyStampEvent", "MarketplaceCategory", "MarketplaceListing", "MarketplaceListingCategory", "MarketplaceLocality", "McpConnection", "McpOAuthClient", "McpOAuthCode", "McpOAuthRequest", "McpOAuthToken", "McpOperation", "McpProfile", "McpRolloutState", "PlatformDiscountCode", "PlatformDiscountRedemption", "PosPayment", "PrivacyRequest", "PrivacyRestriction", "ProductionOrder", "PuriFeedback", "PuriRequest", "PuriToolCall", "PuriUiEvent", "ServiceCategory", "ServiceOptionAlternative", "ServiceOptionCategory", "StaffLocation", "StaffLocationSchedule", "StaffScheduleOverride", "StoryCampaign", "StoryPreset", "SubscriptionPaymentNotification", "SuperAdminSession", "TrackingConsent", "TrackingEvent", "WebsiteAddon", "WebsiteBillingEvent", "WebsiteCheckoutOperation", "WebsiteCommercialEvent", "WebsiteDomain", "WebsiteLaunchSnapshot", "WebsiteMedia", "WebsiteOfferEligibility", "WebsitePurchaseIntent", "WidgetPromoBlock", "WidgetTheme" FROM authenticated; END IF;
END $$;
