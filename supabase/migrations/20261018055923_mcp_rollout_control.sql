-- Server-only launch control. Absence of the singleton means review-only.
CREATE TABLE "McpRolloutState" (
  "id" TEXT NOT NULL,
  "businessAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  "approvalReference" TEXT,
  "approvedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "McpRolloutState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "McpRolloutState_singleton" CHECK ("id" = 'global'),
  CONSTRAINT "McpRolloutState_approval_required" CHECK (
    NOT "businessAccessEnabled" OR ("approvedAt" IS NOT NULL AND length(trim("approvalReference")) > 0 AND "approvalReference" IS NOT NULL)
  )
);
ALTER TABLE "McpRolloutState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "McpRolloutState" FROM PUBLIC;
DO $$
DECLARE client_role TEXT;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "McpRolloutState" FROM %I', client_role);
    END IF;
  END LOOP;
END $$;
