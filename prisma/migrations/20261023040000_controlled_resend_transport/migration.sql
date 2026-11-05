-- Backend release gates still prohibit production. The controlled adapter also
-- requires a test business, explicit recipient allowlist and verified sender.
ALTER TABLE "CfMessage" DROP CONSTRAINT cf_message_contract;
ALTER TABLE "CfMessage" ADD CONSTRAINT cf_message_contract CHECK (
  provider IN ('SIMULATED','RESEND')
  AND state IN ('QUEUED','ACCEPTED','DELIVERED','BOUNCED','COMPLAINED','FAILED','EXCLUDED','UNKNOWN','EXPIRED')
  AND simulation IN ('SUCCESS','REJECT','BOUNCE','TIMEOUT_ACCEPTED','TIMEOUT_UNKNOWN','RATE_LIMIT','TEMPORARY','NO_IDEMPOTENCY_TIMEOUT')
  AND (provider<>'RESEND' OR simulation='SUCCESS')
);
