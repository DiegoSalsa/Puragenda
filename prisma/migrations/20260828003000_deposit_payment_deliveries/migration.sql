CREATE TABLE "DepositPaymentDelivery" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "notificationsDeliveredAt" TIMESTAMP(3),
    "calendarSyncedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPaymentDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepositPaymentDelivery_appointmentId_key"
ON "DepositPaymentDelivery"("appointmentId");

CREATE INDEX "DepositPaymentDelivery_nextAttemptAt_idx"
ON "DepositPaymentDelivery"("nextAttemptAt");

ALTER TABLE "DepositPaymentDelivery"
ADD CONSTRAINT "DepositPaymentDelivery_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
