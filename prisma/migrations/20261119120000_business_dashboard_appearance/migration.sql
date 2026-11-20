BEGIN;

CREATE TABLE "BusinessDashboardAppearance" (
    "businessId" TEXT NOT NULL,
    "christmasEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "BusinessDashboardAppearance_pkey" PRIMARY KEY ("businessId"),
    CONSTRAINT "BusinessDashboardAppearance_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "BusinessDashboardAppearance" ENABLE ROW LEVEL SECURITY;

COMMIT;
