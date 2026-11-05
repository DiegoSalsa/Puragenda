BEGIN;
-- CreateTable
CREATE TABLE "BusinessSetup" (
    "businessId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 2,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT,
    "industry" TEXT,
    "currentStep" TEXT NOT NULL DEFAULT 'business',
    "draft" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verification" JSONB,
    "completedAt" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetup_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "SetupOperation" (
    "businessId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupOperation_pkey" PRIMARY KEY ("businessId","key")
);

-- CreateTable
CREATE TABLE "TutorialProgress" (
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorialProgress_pkey" PRIMARY KEY ("businessId","userId","tutorialId","version")
);

-- CreateIndex
CREATE INDEX "SetupOperation_createdAt_idx" ON "SetupOperation"("createdAt");

-- CreateIndex
CREATE INDEX "TutorialProgress_userId_businessId_idx" ON "TutorialProgress"("userId", "businessId");

-- AddForeignKey
ALTER TABLE "BusinessSetup" ADD CONSTRAINT "BusinessSetup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupOperation" ADD CONSTRAINT "SetupOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialProgress" ADD CONSTRAINT "TutorialProgress_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialProgress" ADD CONSTRAINT "TutorialProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Only the authenticated application server accesses these tables. Custom signed
-- sessions are verified in the server; Data API roles have no table grants.
ALTER TABLE "BusinessSetup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SetupOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorialProgress" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BusinessSetup", "SetupOperation", "TutorialProgress" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON TABLE "BusinessSetup", "SetupOperation", "TutorialProgress" FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON TABLE "BusinessSetup", "SetupOperation", "TutorialProgress" FROM authenticated;
 END IF;
END $$;
ALTER TABLE "BusinessSetup" ADD CONSTRAINT "BusinessSetup_revision_valid" CHECK (revision >= 0 AND version = 2);
ALTER TABLE "BusinessSetup" ADD CONSTRAINT "BusinessSetup_mode_valid" CHECK (mode IS NULL OR mode IN ('solo','team'));
ALTER TABLE "BusinessSetup" ADD CONSTRAINT "BusinessSetup_step_valid" CHECK ("currentStep" IN ('business','hours','staff','services','check'));
ALTER TABLE "TutorialProgress" ADD CONSTRAINT "TutorialProgress_state_valid" CHECK (step >= 0 AND revision >= 0 AND version > 0 AND status IN ('active','paused','completed'));
COMMIT;
