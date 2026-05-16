-- Rename UserRole enum values: OWNER → ADMIN, MANAGER → RECEPTIONIST
-- Already applied to production. For shadow DB, the enum is created
-- with the correct values from schema, so these are safe no-ops.

-- Step 1: Add new values to enum (safe, IF NOT EXISTS — no-op if already present)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';

-- Step 2: Update existing rows
UPDATE "User" SET "role" = 'ADMIN' WHERE "role"::text = 'OWNER';
UPDATE "User" SET "role" = 'RECEPTIONIST' WHERE "role"::text = 'MANAGER';

-- Step 3: Update default value
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
