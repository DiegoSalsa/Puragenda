-- Provider verification predating the tenant challenge is not proof of ownership.
-- Preserve hostname reservations; owners must verify a new TXT before routing.
ALTER TABLE "WebsiteDomain" ADD COLUMN "tenantVerifiedAt" TIMESTAMP(3);
UPDATE "WebsiteDomain"
SET "status" = 'PENDING', "isPrimary" = false, "verifiedAt" = NULL,
    "activatedAt" = NULL, "provider" = 'pending', "checkedAt" = NULL,
    "verificationToken" = 'puragenda-verify=' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    "lastError" = 'Publica el nuevo TXT de Puragenda para verificar la propiedad de este dominio.';
UPDATE "WebsiteDomain"
SET "dnsRecords" = jsonb_build_array(jsonb_build_object('type', 'TXT', 'name', '_puragenda.' || "hostname", 'value', "verificationToken"));
