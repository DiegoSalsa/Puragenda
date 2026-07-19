-- Add home-service configuration and the customer's visit address.
ALTER TABLE "ServiceOptionAlternative" ADD COLUMN "isHomeService" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "customerAddress" TEXT;
ALTER TABLE "RecurringBooking" ADD COLUMN "customerAddress" TEXT;
