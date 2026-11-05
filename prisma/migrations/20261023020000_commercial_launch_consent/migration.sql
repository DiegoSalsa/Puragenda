-- New public evidence sources retain the existing immutable signed receipt.
-- Anonymous submissions cannot become eligible until a verified portal opt-in.
ALTER TABLE "CfConsent" DROP CONSTRAINT cf_consent_contract;
ALTER TABLE "CfConsent" ADD CONSTRAINT cf_consent_contract CHECK (
  channel='EMAIL' AND purpose='COMMERCIAL' AND length("addressHash")=64
  AND length("evidenceHash")=64 AND length("evidenceRef")>0
  AND "textVersion"='cf-commercial-email-v1' AND length("acceptedText")>0
  AND length("evidenceSignature")=43
  AND source IN ('SYNTHETIC_FORM','PUBLIC_WIDGET','CLIENT_PORTAL')
  AND ((state IN ('GRANTED','PENDING_VERIFICATION') AND "revokedAt" IS NULL)
    OR (state='REVOKED' AND "revokedAt">="grantedAt"))
  AND (source<>'PUBLIC_WIDGET' OR state IN ('PENDING_VERIFICATION','REVOKED'))
);
