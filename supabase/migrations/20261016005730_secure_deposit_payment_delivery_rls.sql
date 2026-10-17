-- Delivery retries and payment references are server-only data accessed via Prisma.
-- Match the other application tables: deny direct access from browser API roles.
ALTER TABLE public."DepositPaymentDelivery" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."DepositPaymentDelivery" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."DepositPaymentDelivery" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."DepositPaymentDelivery" FROM authenticated;
  END IF;
END
$$;
