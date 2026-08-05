ALTER TABLE "Business"
ADD COLUMN "includeAppointmentActionsInConfirmationEmail" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Appointment"
ADD COLUMN "customerActionTokenHash" TEXT,
ADD COLUMN "customerActionTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "customerActionTokenUsedAt" TIMESTAMP(3),
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Appointment_customerActionTokenHash_key"
ON "Appointment"("customerActionTokenHash");

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_customer_action_token_expiry_check"
CHECK (
  "customerActionTokenExpiresAt" IS NULL
  OR "customerActionTokenExpiresAt" > "createdAt"
);
