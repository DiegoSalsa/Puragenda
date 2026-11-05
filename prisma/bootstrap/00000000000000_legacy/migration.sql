BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WebsiteDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "DomainRequestStatus" AS ENUM ('REQUESTED', 'REVIEWING', 'QUOTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebsitePriceTier" AS ENUM ('STANDARD', 'BETA_FOUNDER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RECEPTIONIST', 'STAFF', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ClientPortalTokenPurpose" AS ENUM ('MAGIC_ACCESS', 'VERIFY_ACCOUNT', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "ServiceAvailabilityType" AS ENUM ('NORMAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "WidgetPromoPlacement" AS ENUM ('HEADER', 'BETWEEN_SERVICES', 'FOOTER');

-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_SERVICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LoyaltyStampSource" AS ENUM ('APPOINTMENT', 'MANUAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GiftCardType" AS ENUM ('BALANCE', 'SERVICE');

-- CreateEnum
CREATE TYPE "GiftCardPaymentMethod" AS ENUM ('MERCADOPAGO', 'MANUAL');

-- CreateEnum
CREATE TYPE "GiftCardPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'MANUAL_PAID');

-- CreateEnum
CREATE TYPE "GiftCardDeliveryMode" AS ENUM ('SELF', 'GIFT');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'VOIDED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GiftCardTransactionType" AS ENUM ('ISSUED', 'REDEEMED', 'RELEASED', 'ADJUSTMENT', 'VOID', 'REFUND');

-- CreateEnum
CREATE TYPE "GiftCardRedemptionStatus" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "BookingFeedbackRating" AS ENUM ('POSITIVE', 'IMPROVE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('INDIVIDUAL', 'EQUIPO', 'TEST');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'INACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('AUTOMATIC', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "RecurringMode" AS ENUM ('FIXED_DAYS', 'DAYS_WITH_REST', 'FREE_MINIMUM');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DepositPaymentMode" AS ENUM ('MERCADOPAGO', 'MANUAL_LINK');

-- CreateEnum
CREATE TYPE "BookingDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('UNAVAILABLE', 'PRIORITY');

-- CreateEnum
CREATE TYPE "ServiceBookingMode" AS ENUM ('APPOINTMENT', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ProductionScheduleMode" AS ENUM ('WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('AWAITING_DEPOSIT', 'REFERENCES_REVIEW', 'QUEUED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'BALANCE_DUE', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DepositReceiptStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PosPaymentChannel" AS ENUM ('QR', 'POINT');

-- CreateEnum
CREATE TYPE "PosPaymentStatus" AS ENUM ('CREATING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrizeStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'USED');

-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "BookingOperation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "ownerToken" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "appointmentId" TEXT,
    "response" JSONB,
    "httpStatus" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessWebsite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL DEFAULT 'bella',
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "subdomain" TEXT NOT NULL,
    "draftConfig" JSONB NOT NULL,
    "publishedConfig" JSONB,
    "templateConfigs" JSONB NOT NULL DEFAULT '{}',
    "publishedTemplateKey" TEXT,
    "publishedTemplateVersion" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publishedRevision" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMedia" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "usage" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cloudinary',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteDomain" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" "WebsiteDomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT NOT NULL,
    "tenantVerifiedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'pending',
    "dnsRecords" JSONB NOT NULL DEFAULT '[]',
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRequest" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "DomainRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteAddon" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'paddle',
    "paddleSubscriptionId" TEXT,
    "paddleCustomerId" TEXT,
    "paddlePriceId" TEXT,
    "checkoutTransactionId" TEXT,
    "mpSubscriptionId" TEXT,
    "mpCustomerId" TEXT,
    "validUntil" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3),
    "lastEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteCheckoutOperation" (
    "id" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mercadopago',
    "priceTier" "WebsitePriceTier" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "firstChargeAt" TIMESTAMP(3),
    "state" TEXT NOT NULL DEFAULT 'CREATING',
    "mpSubscriptionId" TEXT,
    "checkoutUrl" TEXT,
    "providerStatus" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteCheckoutOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteBillingEvent" (
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteBillingEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "WebsiteLaunchSnapshot" (
    "id" TEXT NOT NULL,
    "launchAt" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "memberCount" INTEGER NOT NULL,

    CONSTRAINT "WebsiteLaunchSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteOfferEligibility" (
    "businessId" TEXT NOT NULL,
    "offerCode" "WebsitePriceTier" NOT NULL DEFAULT 'BETA_FOUNDER',
    "snapshotId" TEXT NOT NULL,
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "trialConsumedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteOfferEligibility_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "WebsiteCommercialEvent" (
    "key" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "priceTier" "WebsitePriceTier" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteCommercialEvent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "trialUsedAt" TIMESTAMP(3),
    "registrationIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "purpose" "ClientPortalTokenPurpose" NOT NULL DEFAULT 'MAGIC_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "rut" TEXT,
    "defaultAddress" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAuthAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "rememberDevice" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SuperAdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistedIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "extraStaffCount" INTEGER NOT NULL DEFAULT 0,
    "staffLimitOverride" INTEGER,
    "paymentMethod" "SubscriptionPaymentMethod" NOT NULL DEFAULT 'AUTOMATIC',
    "customMonthlyPriceClp" INTEGER,
    "pendingDiscountPercentage" INTEGER,
    "hasCountedAsPaidReferral" BOOLEAN NOT NULL DEFAULT false,
    "trialWarningEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "freeMonthsRemaining" INTEGER NOT NULL DEFAULT 0,
    "activePrizeId" TEXT,
    "promoName" TEXT,
    "promoFreeMonthsRemaining" INTEGER NOT NULL DEFAULT 0,
    "promoDiscountPercentage" INTEGER,
    "promoDiscountMonthsRemaining" INTEGER NOT NULL DEFAULT 0,
    "nextBillingOverrideAmount" INTEGER,
    "billingNotes" TEXT,
    "lastBillingSyncAt" TIMESTAMP(3),
    "lastBillingSyncError" TEXT,
    "businessId" TEXT NOT NULL,
    "mpCustomerId" TEXT,
    "mpSubscriptionId" TEXT,
    "paddleCustomerId" TEXT,
    "paddleSubscriptionId" TEXT,
    "paddlePriceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paddleLastEventAt" TIMESTAMP(3),
    "paddleLastEventId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "paymentFailedAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "nextPaymentAttemptAt" TIMESTAMP(3),
    "lastInvoiceId" TEXT,
    "lastInvoiceStatus" TEXT,
    "lastPaymentId" TEXT,
    "lastPaymentStatus" TEXT,
    "lastPaymentStatusDetail" TEXT,
    "lastPaymentAttemptAt" TIMESTAMP(3),
    "paymentRetryCount" INTEGER NOT NULL DEFAULT 0,
    "dunningEmailSentAt" TIMESTAMP(3),
    "graceExpiryWarningSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPaymentNotification" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" "SubscriptionPaymentNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPaymentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePurchaseIntent" (
    "businessId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseOperationKey" TEXT,
    "baseState" TEXT NOT NULL DEFAULT 'NONE',
    "baseCheckoutUrl" TEXT,
    "baseProviderId" TEXT,
    "baseActivatedAt" TIMESTAMP(3),

    CONSTRAINT "WebsitePurchaseIntent_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "Business" (
    "mcpPublicDiscovery" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "mapsUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "secondaryColor" TEXT NOT NULL DEFAULT '#5B21B6',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0A0A0A',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textMutedColor" TEXT NOT NULL DEFAULT '#FFFFFF66',
    "widgetFontSize" INTEGER NOT NULL DEFAULT 14,
    "brandColor" TEXT,
    "maxServicesPerBooking" INTEGER NOT NULL DEFAULT 1,
    "groupServicesByCategory" BOOLEAN NOT NULL DEFAULT false,
    "widgetCornerRadius" INTEGER NOT NULL DEFAULT 16,
    "widgetShadowStyle" TEXT NOT NULL DEFAULT 'soft',
    "widgetHeaderAlign" TEXT NOT NULL DEFAULT 'left',
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositPaymentMode" "DepositPaymentMode" NOT NULL DEFAULT 'MERCADOPAGO',
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryCode" TEXT NOT NULL DEFAULT 'CL',
    "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "ownerId" TEXT,
    "referredByAffiliateId" TEXT,
    "mpAccessToken" TEXT,
    "mpRefreshToken" TEXT,
    "mpUserId" TEXT,
    "mpTokenExpiresAt" TIMESTAMP(3),
    "isLoyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stampsRequired" INTEGER NOT NULL DEFAULT 5,
    "rewardName" TEXT,
    "discountType" TEXT,
    "discountValue" INTEGER,
    "loyaltyCodePrefix" TEXT NOT NULL DEFAULT 'PREMIO',
    "loyaltyRewardType" "LoyaltyRewardType" NOT NULL DEFAULT 'PERCENTAGE',
    "loyaltyRewardServiceId" TEXT,
    "loyaltyRewardExpirationDays" INTEGER,
    "requiresClientRut" BOOLEAN NOT NULL DEFAULT false,
    "allowRescheduling" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleHoursLimit" INTEGER NOT NULL DEFAULT 24,
    "includeAppointmentActionsInConfirmationEmail" BOOLEAN NOT NULL DEFAULT false,
    "allowSameDayBookings" BOOLEAN NOT NULL DEFAULT false,
    "slotInterval" INTEGER NOT NULL DEFAULT 60,
    "minAdvanceBookingMinutes" INTEGER NOT NULL DEFAULT 120,
    "productionOrdersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "marketplacePromptDismissedAt" TIMESTAMP(3),

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLocation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "mapsUrl" TEXT,
    "timezone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationHours" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,

    CONSTRAINT "LocationHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationScheduleOverride" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationService" (
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationService_pkey" PRIMARY KEY ("locationId","serviceId")
);

-- CreateTable
CREATE TABLE "StaffLocation" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLocationSchedule" (
    "id" TEXT NOT NULL,
    "staffLocationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,

    CONSTRAINT "StaffLocationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetTheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Personalizado',
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "textMutedColor" TEXT NOT NULL,
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "cornerRadius" INTEGER NOT NULL DEFAULT 16,
    "shadowStyle" TEXT NOT NULL DEFAULT 'soft',
    "headerAlign" TEXT NOT NULL DEFAULT 'left',
    "logoUrl" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetPromoBlock" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "linkUrl" TEXT,
    "placement" "WidgetPromoPlacement" NOT NULL DEFAULT 'HEADER',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "textAlign" TEXT NOT NULL DEFAULT 'left',
    "discountType" TEXT,
    "discountValue" INTEGER,
    "discountStartsAt" TIMESTAMP(3),
    "discountEndsAt" TIMESTAMP(3),
    "discountMinSubtotal" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetPromoBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDiscountCode" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "BookingDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minSubtotal" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "baseRole" "UserRole",
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "trialEndsAtFrom" TIMESTAMP(3),
    "trialEndsAtTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDiscountRedemption" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "originalAmount" INTEGER NOT NULL,
    "discountedAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformDiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInteractiveCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "fields" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInteractiveCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInteractiveRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "businessSlug" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AdminInteractiveRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInteractiveResponse" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "rating" INTEGER,
    "answers" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInteractiveResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessScheduleOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "imageUrl" TEXT,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "accessProfileId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSchedule" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffScheduleOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "locationId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "type" "ScheduleBlockType" NOT NULL DEFAULT 'UNAVAILABLE',
    "releaseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "imageUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "depositPaymentUrl" TEXT,
    "bookingMode" "ServiceBookingMode" NOT NULL DEFAULT 'APPOINTMENT',
    "productionScheduleMode" "ProductionScheduleMode" NOT NULL DEFAULT 'WEEKLY',
    "weeklyProductionCapacity" INTEGER NOT NULL DEFAULT 5,
    "productionWeeksAhead" INTEGER NOT NULL DEFAULT 24,
    "productionLeadTimeWeeks" INTEGER NOT NULL DEFAULT 1,
    "customProductionWindows" JSONB,
    "productionDepositPercent" INTEGER NOT NULL DEFAULT 50,
    "requiresReferenceImages" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "availabilityType" "ServiceAvailabilityType" NOT NULL DEFAULT 'NORMAL',
    "specialWeekDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "specialStartDate" DATE,
    "specialEndDate" DATE,
    "specialStartTime" TEXT,
    "specialEndTime" TEXT,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "petName" TEXT NOT NULL,
    "petDetails" TEXT NOT NULL,
    "referenceImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productionWeek" DATE NOT NULL,
    "productionWindowKey" TEXT,
    "productionWindowLabel" TEXT,
    "productionWindowEnd" DATE,
    "selectedOptions" JSONB,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "depositAmount" INTEGER NOT NULL,
    "balanceAmount" INTEGER NOT NULL,
    "depositPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "balancePaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
    "depositMpPreferenceId" TEXT,
    "depositMpPaymentId" TEXT,
    "balanceMpPreferenceId" TEXT,
    "balanceMpPaymentId" TEXT,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'COORDINATE',
    "customerAddress" TEXT,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'AWAITING_DEPOSIT',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOptionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOptionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOptionAlternative" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationDelta" INTEGER NOT NULL DEFAULT 0,
    "isHomeService" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOptionAlternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringPlan" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "mode" "RecurringMode" NOT NULL DEFAULT 'FIXED_DAYS',
    "fixedDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "daysPerWeek" INTEGER,
    "minRestDays" INTEGER,
    "durationOptions" INTEGER[] DEFAULT ARRAY[1]::INTEGER[],
    "startDateRangeDays" INTEGER NOT NULL DEFAULT 14,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresHealthForm" BOOLEAN NOT NULL DEFAULT false,
    "healthQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresRut" BOOLEAN NOT NULL DEFAULT false,
    "renewalMessage" TEXT,
    "expirationWarningDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBooking" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "serviceId" TEXT NOT NULL,
    "recurringPlanId" TEXT NOT NULL,
    "staffId" TEXT,
    "clientId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerRut" TEXT,
    "status" "RecurringStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "selectedDays" INTEGER[],
    "selectedTimes" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "healthAnswers" JSONB,
    "healthFreeText" TEXT,
    "healthAccepted" BOOLEAN NOT NULL DEFAULT false,
    "pausedUntil" TIMESTAMP(3),
    "internalNotes" TEXT,
    "expirationWarningSent" BOOLEAN NOT NULL DEFAULT false,
    "renewalOffered" BOOLEAN NOT NULL DEFAULT false,
    "managementToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSessionOverride" (
    "id" TEXT NOT NULL,
    "recurringBookingId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "newTime" TEXT,
    "reason" TEXT,
    "requestedByClient" BOOLEAN NOT NULL DEFAULT false,
    "warningSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSessionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "additionalServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalDuration" INTEGER,
    "totalPrice" DOUBLE PRECISION,
    "originalTotalPrice" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "giftCardPaidAmount" INTEGER NOT NULL DEFAULT 0,
    "promotionId" TEXT,
    "promotionTitle" TEXT,
    "bookingDiscountCodeId" TEXT,
    "bookingDiscountCodeValue" TEXT,
    "selectedOptions" JSONB,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "serviceId" TEXT NOT NULL,
    "staffId" TEXT,
    "clientId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "actionToken" TEXT,
    "customerActionTokenHash" TEXT,
    "customerActionTokenExpiresAt" TIMESTAMP(3),
    "customerActionTokenUsedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "sessionBaseAmount" DOUBLE PRECISION,
    "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postSessionItems" JSONB,
    "paymentMethod" TEXT,
    "settledAt" TIMESTAMP(3),
    "settledByUserId" TEXT,
    "depositAmount" INTEGER,
    "depositPaymentUrl" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
    "paymentHoldExpiresAt" TIMESTAMP(3),
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "depositReceiptStatus" "DepositReceiptStatus" NOT NULL DEFAULT 'NONE',
    "depositReceiptPublicId" TEXT,
    "depositReceiptResourceType" TEXT,
    "depositReceiptFormat" TEXT,
    "depositReceiptOriginalName" TEXT,
    "depositReceiptUploadedAt" TIMESTAMP(3),
    "depositReceiptReviewedAt" TIMESTAMP(3),
    "depositReceiptReviewedById" TEXT,
    "depositReceiptTokenHash" TEXT,
    "recurringBookingId" TEXT,
    "storyCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFeedback" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "rating" "BookingFeedbackRating" NOT NULL,
    "comment" TEXT,
    "googleReviewClickedAt" TIMESTAMP(3),
    "clientPortalAccountId" TEXT,
    "authenticated" BOOLEAN NOT NULL DEFAULT false,
    "deviceType" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositPaymentDelivery" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "ownerEmailDeliveredAt" TIMESTAMP(3),
    "staffEmailDeliveredAt" TIMESTAMP(3),
    "customerEmailDeliveredAt" TIMESTAMP(3),
    "calendarSyncedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPaymentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "channel" "PosPaymentChannel" NOT NULL DEFAULT 'QR',
    "status" "PosPaymentStatus" NOT NULL DEFAULT 'CREATING',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "providerUserId" TEXT,
    "qrData" TEXT,
    "statusDetail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCampaign" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "locationId" TEXT,
    "staffId" TEXT,
    "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "range" TEXT NOT NULL,
    "targetDate" DATE,
    "headline" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "slotCount" INTEGER NOT NULL DEFAULT 0,
    "potentialRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linkVisits" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "copiedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "objective" TEXT NOT NULL DEFAULT 'FILL_SLOTS',
    "configuration" JSONB,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastVisitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryPreset" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "name" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffId" TEXT,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "calendarName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "includeCustomerAttendee" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarReadSelection" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarReadSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "googleEventUrl" TEXT,
    "etag" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "rut" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "currentStamps" INTEGER NOT NULL DEFAULT 0,
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT true,
    "privateNotes" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GiftCardType" NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "faceValue" INTEGER,
    "currencyCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "designPreset" TEXT NOT NULL DEFAULT 'classic',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFF5BA',
    "accentColor" TEXT NOT NULL DEFAULT '#FF8FAB',
    "textColor" TEXT NOT NULL DEFAULT '#111111',
    "imageUrl" TEXT,
    "shortMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTemplateService" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GiftCardTemplateService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardPurchase" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" "GiftCardType" NOT NULL,
    "paymentMethod" "GiftCardPaymentMethod" NOT NULL,
    "paymentStatus" "GiftCardPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "salePrice" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "templateNameSnapshot" TEXT NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "deliveryMode" "GiftCardDeliveryMode" NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "senderName" TEXT,
    "giftMessage" TEXT,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "mpStatus" TEXT,
    "manualPaymentMethod" TEXT,
    "createdById" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "templateId" TEXT,
    "publicCode" TEXT NOT NULL,
    "claimTokenHash" TEXT NOT NULL,
    "type" "GiftCardType" NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "currencyCode" TEXT NOT NULL,
    "salePriceSnapshot" INTEGER NOT NULL,
    "faceValueSnapshot" INTEGER,
    "designPresetSnapshot" TEXT NOT NULL,
    "backgroundColorSnapshot" TEXT NOT NULL,
    "accentColorSnapshot" TEXT NOT NULL,
    "textColorSnapshot" TEXT NOT NULL,
    "imageUrlSnapshot" TEXT,
    "shortMessageSnapshot" TEXT,
    "initialBalance" INTEGER,
    "remainingBalance" INTEGER,
    "claimedByAccountId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "deliveryEmailSentAt" TIMESTAMP(3),
    "deliveryEmailAttempts" INTEGER NOT NULL DEFAULT 0,
    "deliveryEmailLastError" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardServiceEntitlement" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "unitValueSnapshot" INTEGER NOT NULL,
    "quantityInitial" INTEGER NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,

    CONSTRAINT "GiftCardServiceEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amountCovered" INTEGER NOT NULL DEFAULT 0,
    "status" "GiftCardRedemptionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardRedemptionItem" (
    "id" TEXT NOT NULL,
    "redemptionId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountCovered" INTEGER NOT NULL DEFAULT 0,
    "serviceNameSnapshot" TEXT NOT NULL,

    CONSTRAINT "GiftCardRedemptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "GiftCardTransactionType" NOT NULL,
    "appointmentId" TEXT,
    "redemptionId" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER,
    "rewardType" "LoyaltyRewardType" NOT NULL DEFAULT 'PERCENTAGE',
    "freeServiceId" TEXT,
    "rewardName" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "redeemedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyStampEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "delta" INTEGER NOT NULL,
    "source" "LoyaltyStampSource" NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyStampEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paidReferrals" INTEGER NOT NULL DEFAULT 0,
    "spentTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percentage" INTEGER,
    "freeMonths" INTEGER,
    "name" TEXT NOT NULL,
    "status" "PrizeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audienceSize" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemError" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessLocationId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "model" TEXT,
    "intent" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "totalDurationMs" INTEGER,
    "modelDurationMs" INTEGER,
    "toolsDurationMs" INTEGER,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PuriRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriToolCall" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "resultCount" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuriToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriFeedback" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuriFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriUiEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessLocationId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "errorCode" TEXT,
    "actionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuriUiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "businessId" TEXT,
    "path" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "properties" JSONB,
    "consentVersion" TEXT,
    "consentGrantedAt" TIMESTAMP(3),
    "retentionHoldUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingConsent" (
    "id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionHoldUntil" TIMESTAMP(3),

    CONSTRAINT "TrackingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "identityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "responseSentAt" TIMESTAMP(3),
    "responseChannel" TEXT,
    "responseContent" TEXT,
    "initialDueAt" TIMESTAMP(3),
    "extensionUsed" BOOLEAN NOT NULL DEFAULT false,
    "extensionNoticeSentAt" TIMESTAMP(3),
    "extensionNotes" TEXT,
    "acknowledgementSentAt" TIMESTAMP(3),
    "acknowledgementError" TEXT,
    "adminNotifiedAt" TIMESTAMP(3),
    "technicalAction" TEXT,
    "technicalActionAt" TIMESTAMP(3),
    "technicalActionByUserId" TEXT,
    "technicalActionEvidence" TEXT,
    "exportGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRestriction" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT,
    "visitorId" TEXT,
    "userId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'ANALYTICS',
    "reason" TEXT NOT NULL,
    "sourceRequestId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "seoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceLocality" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "communeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceLocality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "localityId" TEXT,
    "pendingCategoryDescription" TEXT,
    "pendingLocalityName" TEXT,
    "authorizationConfirmedAt" TIMESTAMP(3),
    "authorizationConfirmedById" TEXT,
    "authorizationSource" TEXT,
    "authorizationTextVersion" TEXT,
    "authorizationRevokedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListingCategory" (
    "listingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListingCategory_pkey" PRIMARY KEY ("listingId","categoryId")
);

-- CreateTable
CREATE TABLE "McpRolloutState" (
    "id" TEXT NOT NULL,
    "businessAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "approvalReference" TEXT,
    "approvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpRolloutState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" TEXT[],
    "state" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "csrfHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "McpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpConnection" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "tokenVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "McpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthCode" (
    "hash" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthCode_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "McpOAuthToken" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accessHash" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scopes" TEXT[],
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshUsedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOperation" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "connectionId" TEXT,
    "businessId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "result" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "McpOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceToStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceToStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingOperation_appointmentId_key" ON "BookingOperation"("appointmentId");

-- CreateIndex
CREATE INDEX "BookingOperation_expiresAt_idx" ON "BookingOperation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingOperation_businessId_keyHash_key" ON "BookingOperation"("businessId", "keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWebsite_businessId_key" ON "BusinessWebsite"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWebsite_subdomain_key" ON "BusinessWebsite"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMedia_publicId_key" ON "WebsiteMedia"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMedia_secureUrl_key" ON "WebsiteMedia"("secureUrl");

-- CreateIndex
CREATE INDEX "WebsiteMedia_websiteId_deletedAt_idx" ON "WebsiteMedia"("websiteId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteDomain_hostname_key" ON "WebsiteDomain"("hostname");

-- CreateIndex
CREATE INDEX "WebsiteDomain_websiteId_status_idx" ON "WebsiteDomain"("websiteId", "status");

-- CreateIndex
CREATE INDEX "DomainRequest_websiteId_status_idx" ON "DomainRequest"("websiteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAddon_businessId_key" ON "WebsiteAddon"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAddon_paddleSubscriptionId_key" ON "WebsiteAddon"("paddleSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAddon_mpSubscriptionId_key" ON "WebsiteAddon"("mpSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCheckoutOperation_mpSubscriptionId_key" ON "WebsiteCheckoutOperation"("mpSubscriptionId");

-- CreateIndex
CREATE INDEX "WebsiteCheckoutOperation_addonId_createdAt_idx" ON "WebsiteCheckoutOperation"("addonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteLaunchSnapshot_launchAt_key" ON "WebsiteLaunchSnapshot"("launchAt");

-- CreateIndex
CREATE INDEX "WebsiteCommercialEvent_event_occurredAt_idx" ON "WebsiteCommercialEvent"("event", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_tokenHash_key" ON "ClientPortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientPortalToken_email_createdAt_idx" ON "ClientPortalToken"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ClientPortalToken_expiresAt_idx" ON "ClientPortalToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalAccount_email_key" ON "ClientPortalAccount"("email");

-- CreateIndex
CREATE INDEX "ClientPortalAccount_emailVerifiedAt_idx" ON "ClientPortalAccount"("emailVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalSession_tokenHash_key" ON "ClientPortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientPortalSession_accountId_expiresAt_idx" ON "ClientPortalSession"("accountId", "expiresAt");

-- CreateIndex
CREATE INDEX "ClientPortalSession_expiresAt_idx" ON "ClientPortalSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminLoginCode_userId_createdAt_idx" ON "AdminLoginCode"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLoginCode_expiresAt_idx" ON "AdminLoginCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdminSession_tokenHash_key" ON "SuperAdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "SuperAdminSession_userId_expiresAt_idx" ON "SuperAdminSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "SuperAdminSession_userId_revokedAt_idx" ON "SuperAdminSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "SuperAdminSession_expiresAt_idx" ON "SuperAdminSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedIp_ip_key" ON "BlacklistedIp"("ip");

-- CreateIndex
CREATE INDEX "BlacklistedIp_ip_idx" ON "BlacklistedIp"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_businessId_key" ON "Subscription"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleCustomerId_key" ON "Subscription"("paddleCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_gracePeriodEndsAt_idx" ON "Subscription"("status", "gracePeriodEndsAt");

-- CreateIndex
CREATE INDEX "SubscriptionPaymentNotification_subscriptionId_idx" ON "SubscriptionPaymentNotification"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionPaymentNotification_status_failedAt_idx" ON "SubscriptionPaymentNotification"("status", "failedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentNotification_provider_paymentId_key" ON "SubscriptionPaymentNotification"("provider", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePurchaseIntent_baseOperationKey_key" ON "WebsitePurchaseIntent"("baseOperationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Business_apiKey_key" ON "Business"("apiKey");

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "Business_referredByAffiliateId_idx" ON "Business"("referredByAffiliateId");

-- CreateIndex
CREATE INDEX "Business_loyaltyRewardServiceId_idx" ON "Business"("loyaltyRewardServiceId");

-- CreateIndex
CREATE INDEX "BusinessLocation_businessId_isActive_position_idx" ON "BusinessLocation"("businessId", "isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_businessId_slug_key" ON "BusinessLocation"("businessId", "slug");

-- CreateIndex
CREATE INDEX "LocationHours_locationId_idx" ON "LocationHours"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationHours_locationId_dayOfWeek_key" ON "LocationHours"("locationId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "LocationScheduleOverride_locationId_date_idx" ON "LocationScheduleOverride"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LocationScheduleOverride_locationId_date_key" ON "LocationScheduleOverride"("locationId", "date");

-- CreateIndex
CREATE INDEX "LocationService_serviceId_idx" ON "LocationService"("serviceId");

-- CreateIndex
CREATE INDEX "StaffLocation_locationId_isActive_idx" ON "StaffLocation"("locationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLocation_staffId_locationId_key" ON "StaffLocation"("staffId", "locationId");

-- CreateIndex
CREATE INDEX "StaffLocationSchedule_staffLocationId_idx" ON "StaffLocationSchedule"("staffLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLocationSchedule_staffLocationId_dayOfWeek_key" ON "StaffLocationSchedule"("staffLocationId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "WidgetTheme_businessId_category_idx" ON "WidgetTheme"("businessId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetTheme_businessId_name_key" ON "WidgetTheme"("businessId", "name");

-- CreateIndex
CREATE INDEX "WidgetPromoBlock_businessId_placement_position_idx" ON "WidgetPromoBlock"("businessId", "placement", "position");

-- CreateIndex
CREATE INDEX "WidgetPromoBlock_discount_active_idx" ON "WidgetPromoBlock"("businessId", "isVisible", "discountStartsAt", "discountEndsAt");

-- CreateIndex
CREATE INDEX "BookingDiscountCode_businessId_isActive_startsAt_expiresAt_idx" ON "BookingDiscountCode"("businessId", "isActive", "startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingDiscountCode_businessId_code_key" ON "BookingDiscountCode"("businessId", "code");

-- CreateIndex
CREATE INDEX "AccessProfile_businessId_isSystem_idx" ON "AccessProfile"("businessId", "isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "AccessProfile_businessId_name_key" ON "AccessProfile"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformDiscountCode_code_key" ON "PlatformDiscountCode"("code");

-- CreateIndex
CREATE INDEX "PlatformDiscountCode_isActive_idx" ON "PlatformDiscountCode"("isActive");

-- CreateIndex
CREATE INDEX "PlatformDiscountCode_expiresAt_idx" ON "PlatformDiscountCode"("expiresAt");

-- CreateIndex
CREATE INDEX "PlatformDiscountRedemption_businessId_idx" ON "PlatformDiscountRedemption"("businessId");

-- CreateIndex
CREATE INDEX "PlatformDiscountRedemption_subscriptionId_idx" ON "PlatformDiscountRedemption"("subscriptionId");

-- CreateIndex
CREATE INDEX "PlatformDiscountRedemption_status_idx" ON "PlatformDiscountRedemption"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformDiscountRedemption_discountCodeId_businessId_key" ON "PlatformDiscountRedemption"("discountCodeId", "businessId");

-- CreateIndex
CREATE INDEX "AdminInteractiveCampaign_type_idx" ON "AdminInteractiveCampaign"("type");

-- CreateIndex
CREATE INDEX "AdminInteractiveCampaign_createdAt_idx" ON "AdminInteractiveCampaign"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInteractiveRecipient_token_key" ON "AdminInteractiveRecipient"("token");

-- CreateIndex
CREATE INDEX "AdminInteractiveRecipient_campaignId_idx" ON "AdminInteractiveRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "AdminInteractiveRecipient_email_idx" ON "AdminInteractiveRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInteractiveResponse_recipientId_key" ON "AdminInteractiveResponse"("recipientId");

-- CreateIndex
CREATE INDEX "AdminInteractiveResponse_campaignId_idx" ON "AdminInteractiveResponse"("campaignId");

-- CreateIndex
CREATE INDEX "AdminInteractiveResponse_createdAt_idx" ON "AdminInteractiveResponse"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessHours_businessId_idx" ON "BusinessHours"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_businessId_dayOfWeek_key" ON "BusinessHours"("businessId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "BusinessScheduleOverride_businessId_date_idx" ON "BusinessScheduleOverride"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessScheduleOverride_businessId_date_key" ON "BusinessScheduleOverride"("businessId", "date");

-- CreateIndex
CREATE INDEX "BlockedDate_businessId_idx" ON "BlockedDate"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_businessId_date_key" ON "BlockedDate"("businessId", "date");

-- CreateIndex
CREATE INDEX "Staff_businessId_idx" ON "Staff"("businessId");

-- CreateIndex
CREATE INDEX "Staff_accessProfileId_idx" ON "Staff"("accessProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_businessId_email_key" ON "Staff"("businessId", "email");

-- CreateIndex
CREATE INDEX "StaffSchedule_staffId_idx" ON "StaffSchedule"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSchedule_staffId_dayOfWeek_key" ON "StaffSchedule"("staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StaffScheduleOverride_staffId_date_idx" ON "StaffScheduleOverride"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffScheduleOverride_staffId_date_key" ON "StaffScheduleOverride"("staffId", "date");

-- CreateIndex
CREATE INDEX "ScheduleBlock_staffId_idx" ON "ScheduleBlock"("staffId");

-- CreateIndex
CREATE INDEX "ScheduleBlock_staffId_startTime_endTime_idx" ON "ScheduleBlock"("staffId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "ScheduleBlock_staffId_type_releaseAt_idx" ON "ScheduleBlock"("staffId", "type", "releaseAt");

-- CreateIndex
CREATE INDEX "ScheduleBlock_locationId_idx" ON "ScheduleBlock"("locationId");

-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "Service"("businessId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_businessId_position_idx" ON "Service"("businessId", "position");

-- CreateIndex
CREATE INDEX "ServiceCategory_businessId_position_idx" ON "ServiceCategory"("businessId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_businessId_name_key" ON "ServiceCategory"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ProductionOrder_businessId_status_idx" ON "ProductionOrder"("businessId", "status");

-- CreateIndex
CREATE INDEX "ProductionOrder_serviceId_productionWeek_idx" ON "ProductionOrder"("serviceId", "productionWeek");

-- CreateIndex
CREATE INDEX "ProductionOrder_serviceId_productionWindowKey_idx" ON "ProductionOrder"("serviceId", "productionWindowKey");

-- CreateIndex
CREATE INDEX "ProductionOrder_clientId_idx" ON "ProductionOrder"("clientId");

-- CreateIndex
CREATE INDEX "ProductionOrder_businessId_productionWeek_idx" ON "ProductionOrder"("businessId", "productionWeek");

-- CreateIndex
CREATE INDEX "ProductionOrder_locationId_productionWeek_idx" ON "ProductionOrder"("locationId", "productionWeek");

-- CreateIndex
CREATE INDEX "ProductionOrder_depositMpPreferenceId_idx" ON "ProductionOrder"("depositMpPreferenceId");

-- CreateIndex
CREATE INDEX "ServiceOptionCategory_serviceId_idx" ON "ServiceOptionCategory"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceOptionCategory_serviceId_position_idx" ON "ServiceOptionCategory"("serviceId", "position");

-- CreateIndex
CREATE INDEX "ServiceOptionAlternative_categoryId_idx" ON "ServiceOptionAlternative"("categoryId");

-- CreateIndex
CREATE INDEX "ServiceOptionAlternative_categoryId_position_idx" ON "ServiceOptionAlternative"("categoryId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlan_serviceId_key" ON "RecurringPlan"("serviceId");

-- CreateIndex
CREATE INDEX "RecurringPlan_serviceId_idx" ON "RecurringPlan"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBooking_managementToken_key" ON "RecurringBooking"("managementToken");

-- CreateIndex
CREATE INDEX "RecurringBooking_businessId_idx" ON "RecurringBooking"("businessId");

-- CreateIndex
CREATE INDEX "RecurringBooking_serviceId_idx" ON "RecurringBooking"("serviceId");

-- CreateIndex
CREATE INDEX "RecurringBooking_staffId_idx" ON "RecurringBooking"("staffId");

-- CreateIndex
CREATE INDEX "RecurringBooking_clientId_idx" ON "RecurringBooking"("clientId");

-- CreateIndex
CREATE INDEX "RecurringBooking_status_idx" ON "RecurringBooking"("status");

-- CreateIndex
CREATE INDEX "RecurringBooking_businessId_status_idx" ON "RecurringBooking"("businessId", "status");

-- CreateIndex
CREATE INDEX "RecurringBooking_locationId_status_idx" ON "RecurringBooking"("locationId", "status");

-- CreateIndex
CREATE INDEX "RecurringSessionOverride_recurringBookingId_idx" ON "RecurringSessionOverride"("recurringBookingId");

-- CreateIndex
CREATE INDEX "RecurringSessionOverride_originalDate_idx" ON "RecurringSessionOverride"("originalDate");

-- CreateIndex
CREATE INDEX "RecurringSessionOverride_recurringBookingId_originalDate_idx" ON "RecurringSessionOverride"("recurringBookingId", "originalDate");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_actionToken_key" ON "Appointment"("actionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_customerActionTokenHash_key" ON "Appointment"("customerActionTokenHash");

-- CreateIndex
CREATE INDEX "Appointment_businessId_idx" ON "Appointment"("businessId");

-- CreateIndex
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- CreateIndex
CREATE INDEX "Appointment_staffId_startTime_endTime_idx" ON "Appointment"("staffId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");

-- CreateIndex
CREATE INDEX "Appointment_recurringBookingId_idx" ON "Appointment"("recurringBookingId");

-- CreateIndex
CREATE INDEX "Appointment_promotionId_idx" ON "Appointment"("promotionId");

-- CreateIndex
CREATE INDEX "Appointment_bookingDiscountCodeId_idx" ON "Appointment"("bookingDiscountCodeId");

-- CreateIndex
CREATE INDEX "Appointment_storyCampaignId_idx" ON "Appointment"("storyCampaignId");

-- CreateIndex
CREATE INDEX "Appointment_locationId_startTime_endTime_idx" ON "Appointment"("locationId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Appointment_businessId_status_paymentHoldExpiresAt_idx" ON "Appointment"("businessId", "status", "paymentHoldExpiresAt");

-- CreateIndex
CREATE INDEX "Appointment_settledByUserId_idx" ON "Appointment"("settledByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingFeedback_appointmentId_key" ON "BookingFeedback"("appointmentId");

-- CreateIndex
CREATE INDEX "BookingFeedback_businessId_idx" ON "BookingFeedback"("businessId");

-- CreateIndex
CREATE INDEX "BookingFeedback_createdAt_idx" ON "BookingFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "BookingFeedback_rating_idx" ON "BookingFeedback"("rating");

-- CreateIndex
CREATE INDEX "BookingFeedback_googleReviewClickedAt_idx" ON "BookingFeedback"("googleReviewClickedAt");

-- CreateIndex
CREATE INDEX "BookingFeedback_clientPortalAccountId_idx" ON "BookingFeedback"("clientPortalAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "DepositPaymentDelivery_appointmentId_key" ON "DepositPaymentDelivery"("appointmentId");

-- CreateIndex
CREATE INDEX "DepositPaymentDelivery_nextAttemptAt_idx" ON "DepositPaymentDelivery"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_externalReference_key" ON "PosPayment"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_idempotencyKey_key" ON "PosPayment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PosPayment_providerOrderId_key" ON "PosPayment"("providerOrderId");

-- CreateIndex
CREATE INDEX "PosPayment_businessId_status_createdAt_idx" ON "PosPayment"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PosPayment_appointmentId_status_createdAt_idx" ON "PosPayment"("appointmentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PosPayment_createdByUserId_idx" ON "PosPayment"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryCampaign_token_key" ON "StoryCampaign"("token");

-- CreateIndex
CREATE INDEX "StoryCampaign_businessId_createdAt_idx" ON "StoryCampaign"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "StoryCampaign_businessId_status_createdAt_idx" ON "StoryCampaign"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StoryCampaign_locationId_idx" ON "StoryCampaign"("locationId");

-- CreateIndex
CREATE INDEX "StoryCampaign_staffId_idx" ON "StoryCampaign"("staffId");

-- CreateIndex
CREATE INDEX "StoryPreset_businessId_isDefault_updatedAt_idx" ON "StoryPreset"("businessId", "isDefault", "updatedAt");

-- CreateIndex
CREATE INDEX "StoryPreset_createdByUserId_idx" ON "StoryPreset"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryPreset_businessId_name_key" ON "StoryPreset"("businessId", "name");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_businessId_scope_syncEnabled_idx" ON "GoogleCalendarConnection"("businessId", "scope", "syncEnabled");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_staffId_syncEnabled_idx" ON "GoogleCalendarConnection"("staffId", "syncEnabled");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_userId_idx" ON "GoogleCalendarConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_businessId_scopeKey_key" ON "GoogleCalendarConnection"("businessId", "scopeKey");

-- CreateIndex
CREATE INDEX "GoogleCalendarReadSelection_connectionId_idx" ON "GoogleCalendarReadSelection"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarReadSelection_connectionId_calendarId_key" ON "GoogleCalendarReadSelection"("connectionId", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEvent_appointmentId_key" ON "GoogleCalendarEvent"("appointmentId");

-- CreateIndex
CREATE INDEX "GoogleCalendarEvent_connectionId_idx" ON "GoogleCalendarEvent"("connectionId");

-- CreateIndex
CREATE INDEX "GoogleCalendarEvent_lastSyncedAt_idx" ON "GoogleCalendarEvent"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarEvent_connectionId_calendarId_googleEventId_key" ON "GoogleCalendarEvent"("connectionId", "calendarId", "googleEventId");

-- CreateIndex
CREATE INDEX "Client_businessId_idx" ON "Client"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_businessId_email_key" ON "Client"("businessId", "email");

-- CreateIndex
CREATE INDEX "GiftCardTemplate_businessId_isActive_isPublic_position_idx" ON "GiftCardTemplate"("businessId", "isActive", "isPublic", "position");

-- CreateIndex
CREATE INDEX "GiftCardTemplateService_serviceId_idx" ON "GiftCardTemplateService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardTemplateService_templateId_serviceId_key" ON "GiftCardTemplateService"("templateId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardPurchase_mpPaymentId_key" ON "GiftCardPurchase"("mpPaymentId");

-- CreateIndex
CREATE INDEX "GiftCardPurchase_businessId_paymentStatus_createdAt_idx" ON "GiftCardPurchase"("businessId", "paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardPurchase_templateId_idx" ON "GiftCardPurchase"("templateId");

-- CreateIndex
CREATE INDEX "GiftCardPurchase_mpPreferenceId_idx" ON "GiftCardPurchase"("mpPreferenceId");

-- CreateIndex
CREATE INDEX "GiftCardPurchase_createdById_idx" ON "GiftCardPurchase"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_purchaseId_key" ON "GiftCard"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_publicCode_key" ON "GiftCard"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_claimTokenHash_key" ON "GiftCard"("claimTokenHash");

-- CreateIndex
CREATE INDEX "GiftCard_businessId_status_idx" ON "GiftCard"("businessId", "status");

-- CreateIndex
CREATE INDEX "GiftCard_claimedByAccountId_status_idx" ON "GiftCard"("claimedByAccountId", "status");

-- CreateIndex
CREATE INDEX "GiftCard_templateId_idx" ON "GiftCard"("templateId");

-- CreateIndex
CREATE INDEX "GiftCardServiceEntitlement_giftCardId_idx" ON "GiftCardServiceEntitlement"("giftCardId");

-- CreateIndex
CREATE INDEX "GiftCardServiceEntitlement_serviceId_idx" ON "GiftCardServiceEntitlement"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardServiceEntitlement_giftCardId_serviceId_key" ON "GiftCardServiceEntitlement"("giftCardId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardRedemption_appointmentId_key" ON "GiftCardRedemption"("appointmentId");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_giftCardId_status_idx" ON "GiftCardRedemption"("giftCardId", "status");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_status_createdAt_idx" ON "GiftCardRedemption"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardRedemptionItem_entitlementId_idx" ON "GiftCardRedemptionItem"("entitlementId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardRedemptionItem_redemptionId_entitlementId_key" ON "GiftCardRedemptionItem"("redemptionId", "entitlementId");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_appointmentId_idx" ON "GiftCardTransaction"("appointmentId");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_redemptionId_idx" ON "GiftCardTransaction"("redemptionId");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_createdById_idx" ON "GiftCardTransaction"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCode_code_key" ON "LoyaltyCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCode_redeemedAppointmentId_key" ON "LoyaltyCode"("redeemedAppointmentId");

-- CreateIndex
CREATE INDEX "LoyaltyCode_clientId_idx" ON "LoyaltyCode"("clientId");

-- CreateIndex
CREATE INDEX "LoyaltyCode_businessId_idx" ON "LoyaltyCode"("businessId");

-- CreateIndex
CREATE INDEX "LoyaltyCode_freeServiceId_idx" ON "LoyaltyCode"("freeServiceId");

-- CreateIndex
CREATE INDEX "LoyaltyCode_businessId_isUsed_expiresAt_idx" ON "LoyaltyCode"("businessId", "isUsed", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyStampEvent_appointmentId_key" ON "LoyaltyStampEvent"("appointmentId");

-- CreateIndex
CREATE INDEX "LoyaltyStampEvent_businessId_createdAt_idx" ON "LoyaltyStampEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyStampEvent_clientId_createdAt_idx" ON "LoyaltyStampEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyStampEvent_createdById_idx" ON "LoyaltyStampEvent"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_referralCode_key" ON "Affiliate"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_businessId_key" ON "Affiliate"("businessId");

-- CreateIndex
CREATE INDEX "Affiliate_referralCode_idx" ON "Affiliate"("referralCode");

-- CreateIndex
CREATE INDEX "Prize_affiliateId_idx" ON "Prize"("affiliateId");

-- CreateIndex
CREATE INDEX "Prize_affiliateId_status_idx" ON "Prize"("affiliateId", "status");

-- CreateIndex
CREATE INDEX "MarketingCampaign_businessId_idx" ON "MarketingCampaign"("businessId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_businessId_sentAt_idx" ON "MarketingCampaign"("businessId", "sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemError_createdAt_idx" ON "SystemError"("createdAt");

-- CreateIndex
CREATE INDEX "SystemError_source_idx" ON "SystemError"("source");

-- CreateIndex
CREATE INDEX "PuriRequest_createdAt_idx" ON "PuriRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PuriRequest_businessId_createdAt_idx" ON "PuriRequest"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PuriRequest_userId_businessId_createdAt_idx" ON "PuriRequest"("userId", "businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PuriRequest_businessLocationId_createdAt_idx" ON "PuriRequest"("businessLocationId", "createdAt");

-- CreateIndex
CREATE INDEX "PuriRequest_intent_createdAt_idx" ON "PuriRequest"("intent", "createdAt");

-- CreateIndex
CREATE INDEX "PuriRequest_status_createdAt_idx" ON "PuriRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PuriToolCall_toolName_requestId_idx" ON "PuriToolCall"("toolName", "requestId");

-- CreateIndex
CREATE INDEX "PuriToolCall_requestId_idx" ON "PuriToolCall"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PuriFeedback_requestId_key" ON "PuriFeedback"("requestId");

-- CreateIndex
CREATE INDEX "PuriFeedback_createdAt_idx" ON "PuriFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "PuriUiEvent_event_createdAt_idx" ON "PuriUiEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "PuriUiEvent_businessId_event_createdAt_idx" ON "PuriUiEvent"("businessId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_occurredAt_idx" ON "TrackingEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_event_occurredAt_idx" ON "TrackingEvent"("event", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_visitorId_occurredAt_idx" ON "TrackingEvent"("visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_occurredAt_idx" ON "TrackingEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_userId_occurredAt_idx" ON "TrackingEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_businessId_event_occurredAt_idx" ON "TrackingEvent"("businessId", "event", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingConsent_occurredAt_idx" ON "TrackingConsent"("occurredAt");

-- CreateIndex
CREATE INDEX "TrackingConsent_visitorId_occurredAt_idx" ON "TrackingConsent"("visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingConsent_userId_occurredAt_idx" ON "TrackingConsent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_dueAt_idx" ON "PrivacyRequest"("status", "dueAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_email_createdAt_idx" ON "PrivacyRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_visitorId_createdAt_idx" ON "PrivacyRequest"("visitorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyRestriction_sourceRequestId_key" ON "PrivacyRestriction"("sourceRequestId");

-- CreateIndex
CREATE INDEX "PrivacyRestriction_emailHash_active_idx" ON "PrivacyRestriction"("emailHash", "active");

-- CreateIndex
CREATE INDEX "PrivacyRestriction_visitorId_active_idx" ON "PrivacyRestriction"("visitorId", "active");

-- CreateIndex
CREATE INDEX "PrivacyRestriction_userId_active_idx" ON "PrivacyRestriction"("userId", "active");

-- CreateIndex
CREATE INDEX "ApiRateLimitBucket_resetAt_idx" ON "ApiRateLimitBucket"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_isActive_position_idx" ON "MarketplaceCategory"("isActive", "position");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_seoEnabled_position_idx" ON "MarketplaceCategory"("seoEnabled", "position");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceLocality_slug_key" ON "MarketplaceLocality"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceLocality_isActive_position_idx" ON "MarketplaceLocality"("isActive", "position");

-- CreateIndex
CREATE INDEX "MarketplaceListing_publishedAt_localityId_idx" ON "MarketplaceListing"("publishedAt", "localityId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_status_publishedAt_idx" ON "MarketplaceListing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_businessId_idx" ON "MarketplaceListing"("businessId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_locationId_idx" ON "MarketplaceListing"("locationId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_authorizationConfirmedById_idx" ON "MarketplaceListing"("authorizationConfirmedById");

-- CreateIndex
CREATE INDEX "MarketplaceListing_authorizationRevokedAt_idx" ON "MarketplaceListing"("authorizationRevokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_businessId_locationId_key" ON "MarketplaceListing"("businessId", "locationId");

-- CreateIndex
CREATE INDEX "MarketplaceListingCategory_categoryId_listingId_idx" ON "MarketplaceListingCategory"("categoryId", "listingId");

-- CreateIndex
CREATE INDEX "McpOAuthRequest_expiresAt_idx" ON "McpOAuthRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthRequest_clientId_idx" ON "McpOAuthRequest"("clientId");

-- CreateIndex
CREATE INDEX "McpProfile_businessId_idx" ON "McpProfile"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "McpProfile_userId_businessId_key" ON "McpProfile"("userId", "businessId");

-- CreateIndex
CREATE INDEX "McpConnection_profileId_revokedAt_idx" ON "McpConnection"("profileId", "revokedAt");

-- CreateIndex
CREATE INDEX "McpConnection_clientId_idx" ON "McpConnection"("clientId");

-- CreateIndex
CREATE INDEX "McpConnection_expiresAt_idx" ON "McpConnection"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthCode_expiresAt_idx" ON "McpOAuthCode"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthCode_connectionId_idx" ON "McpOAuthCode"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_accessHash_key" ON "McpOAuthToken"("accessHash");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_refreshHash_key" ON "McpOAuthToken"("refreshHash");

-- CreateIndex
CREATE INDEX "McpOAuthToken_connectionId_idx" ON "McpOAuthToken"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOperation_requestKey_key" ON "McpOperation"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "McpOperation_tokenHash_key" ON "McpOperation"("tokenHash");

-- CreateIndex
CREATE INDEX "McpOperation_expiresAt_idx" ON "McpOperation"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOperation_connectionId_idx" ON "McpOperation"("connectionId");

-- CreateIndex
CREATE INDEX "McpOperation_businessId_idx" ON "McpOperation"("businessId");

-- CreateIndex
CREATE INDEX "_ServiceToStaff_B_index" ON "_ServiceToStaff"("B");

-- AddForeignKey
ALTER TABLE "BookingOperation" ADD CONSTRAINT "BookingOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "BusinessWebsite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMedia" ADD CONSTRAINT "WebsiteMedia_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "WebsiteDomain_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRequest" ADD CONSTRAINT "DomainRequest_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAddon" ADD CONSTRAINT "WebsiteAddon_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteCheckoutOperation" ADD CONSTRAINT "WebsiteCheckoutOperation_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "WebsiteAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOfferEligibility" ADD CONSTRAINT "WebsiteOfferEligibility_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOfferEligibility" ADD CONSTRAINT "WebsiteOfferEligibility_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WebsiteLaunchSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteCommercialEvent" ADD CONSTRAINT "WebsiteCommercialEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortalSession" ADD CONSTRAINT "ClientPortalSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLoginCode" ADD CONSTRAINT "AdminLoginCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAdminSession" ADD CONSTRAINT "SuperAdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentNotification" ADD CONSTRAINT "SubscriptionPaymentNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePurchaseIntent" ADD CONSTRAINT "WebsitePurchaseIntent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_referredByAffiliateId_fkey" FOREIGN KEY ("referredByAffiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_loyaltyRewardServiceId_fkey" FOREIGN KEY ("loyaltyRewardServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLocation" ADD CONSTRAINT "BusinessLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationHours" ADD CONSTRAINT "LocationHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationScheduleOverride" ADD CONSTRAINT "LocationScheduleOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationService" ADD CONSTRAINT "LocationService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationService" ADD CONSTRAINT "LocationService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLocation" ADD CONSTRAINT "StaffLocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLocation" ADD CONSTRAINT "StaffLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLocationSchedule" ADD CONSTRAINT "StaffLocationSchedule_staffLocationId_fkey" FOREIGN KEY ("staffLocationId") REFERENCES "StaffLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetTheme" ADD CONSTRAINT "WidgetTheme_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetPromoBlock" ADD CONSTRAINT "WidgetPromoBlock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDiscountCode" ADD CONSTRAINT "BookingDiscountCode_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessProfile" ADD CONSTRAINT "AccessProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDiscountCode" ADD CONSTRAINT "PlatformDiscountCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDiscountRedemption" ADD CONSTRAINT "PlatformDiscountRedemption_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "PlatformDiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDiscountRedemption" ADD CONSTRAINT "PlatformDiscountRedemption_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDiscountRedemption" ADD CONSTRAINT "PlatformDiscountRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInteractiveCampaign" ADD CONSTRAINT "AdminInteractiveCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInteractiveRecipient" ADD CONSTRAINT "AdminInteractiveRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdminInteractiveCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInteractiveResponse" ADD CONSTRAINT "AdminInteractiveResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdminInteractiveCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInteractiveResponse" ADD CONSTRAINT "AdminInteractiveResponse_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "AdminInteractiveRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessScheduleOverride" ADD CONSTRAINT "BusinessScheduleOverride_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_accessProfileId_fkey" FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffScheduleOverride" ADD CONSTRAINT "StaffScheduleOverride_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOptionCategory" ADD CONSTRAINT "ServiceOptionCategory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOptionAlternative" ADD CONSTRAINT "ServiceOptionAlternative_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceOptionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPlan" ADD CONSTRAINT "RecurringPlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES "RecurringPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSessionOverride" ADD CONSTRAINT "RecurringSessionOverride_recurringBookingId_fkey" FOREIGN KEY ("recurringBookingId") REFERENCES "RecurringBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_recurringBookingId_fkey" FOREIGN KEY ("recurringBookingId") REFERENCES "RecurringBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "WidgetPromoBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bookingDiscountCodeId_fkey" FOREIGN KEY ("bookingDiscountCodeId") REFERENCES "BookingDiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_storyCampaignId_fkey" FOREIGN KEY ("storyCampaignId") REFERENCES "StoryCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_settledByUserId_fkey" FOREIGN KEY ("settledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_clientPortalAccountId_fkey" FOREIGN KEY ("clientPortalAccountId") REFERENCES "ClientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositPaymentDelivery" ADD CONSTRAINT "DepositPaymentDelivery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosPayment" ADD CONSTRAINT "PosPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCampaign" ADD CONSTRAINT "StoryCampaign_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPreset" ADD CONSTRAINT "StoryPreset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPreset" ADD CONSTRAINT "StoryPreset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarReadSelection" ADD CONSTRAINT "GoogleCalendarReadSelection_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarEvent" ADD CONSTRAINT "GoogleCalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTemplate" ADD CONSTRAINT "GiftCardTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTemplateService" ADD CONSTRAINT "GiftCardTemplateService_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTemplateService" ADD CONSTRAINT "GiftCardTemplateService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "GiftCardPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_claimedByAccountId_fkey" FOREIGN KEY ("claimedByAccountId") REFERENCES "ClientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "GiftCardRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "GiftCardServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "GiftCardRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCode" ADD CONSTRAINT "LoyaltyCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCode" ADD CONSTRAINT "LoyaltyCode_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCode" ADD CONSTRAINT "LoyaltyCode_freeServiceId_fkey" FOREIGN KEY ("freeServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCode" ADD CONSTRAINT "LoyaltyCode_redeemedAppointmentId_fkey" FOREIGN KEY ("redeemedAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStampEvent" ADD CONSTRAINT "LoyaltyStampEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStampEvent" ADD CONSTRAINT "LoyaltyStampEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStampEvent" ADD CONSTRAINT "LoyaltyStampEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStampEvent" ADD CONSTRAINT "LoyaltyStampEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriToolCall" ADD CONSTRAINT "PuriToolCall_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PuriRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriFeedback" ADD CONSTRAINT "PuriFeedback_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PuriRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "MarketplaceLocality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_authorizationConfirmedById_fkey" FOREIGN KEY ("authorizationConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListingCategory" ADD CONSTRAINT "MarketplaceListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListingCategory" ADD CONSTRAINT "MarketplaceListingCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthRequest" ADD CONSTRAINT "McpOAuthRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpProfile" ADD CONSTRAINT "McpProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpProfile" ADD CONSTRAINT "McpProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "McpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToStaff" ADD CONSTRAINT "_ServiceToStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToStaff" ADD CONSTRAINT "_ServiceToStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

COMMIT;
