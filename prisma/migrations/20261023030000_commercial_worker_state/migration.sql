CREATE TABLE "CommercialWorkerState" (
  "key" TEXT PRIMARY KEY, "leaseOwner" TEXT, "leaseUntil" TIMESTAMP(3),
  "fence" INTEGER NOT NULL DEFAULT 0, "cursor" TEXT NOT NULL DEFAULT '',
  "lastStartedAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "lastError" TEXT,
  "summary" JSONB, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT commercial_worker_lease CHECK (fence>=0 AND (("leaseOwner" IS NULL AND "leaseUntil" IS NULL) OR ("leaseOwner" IS NOT NULL AND "leaseUntil" IS NOT NULL)))
);
ALTER TABLE "CommercialWorkerState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CommercialWorkerState" FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "CommercialWorkerState" FROM %I',r); END IF;
  END LOOP;
END $$;
