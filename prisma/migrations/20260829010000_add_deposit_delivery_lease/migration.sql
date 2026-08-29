-- Keep a worker lease separate from the retry schedule. This allows an
-- authenticated operator to retry a failed delivery immediately without
-- stealing a delivery that another request is actively processing.
ALTER TABLE "DepositPaymentDelivery"
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
