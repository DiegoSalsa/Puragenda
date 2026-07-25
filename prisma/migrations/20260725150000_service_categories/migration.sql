ALTER TABLE "Business"
  ADD COLUMN "groupServicesByCategory" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ServiceCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceCategory_position_check" CHECK ("position" >= 0)
);

ALTER TABLE "Service"
  ADD COLUMN "categoryId" TEXT;

CREATE UNIQUE INDEX "ServiceCategory_businessId_name_key"
  ON "ServiceCategory"("businessId", "name");

CREATE INDEX "ServiceCategory_businessId_position_idx"
  ON "ServiceCategory"("businessId", "position");

CREATE INDEX "Service_categoryId_idx"
  ON "Service"("categoryId");

ALTER TABLE "ServiceCategory"
  ADD CONSTRAINT "ServiceCategory_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceCategory" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "ServiceCategory" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "ServiceCategory" FROM authenticated;
  END IF;
END
$$;
