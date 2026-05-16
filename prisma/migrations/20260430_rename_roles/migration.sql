-- Rename UserRole enum values: OWNER → ADMIN, MANAGER → RECEPTIONIST
-- This preserves all existing data

-- Step 1: Add new values to enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';

-- Step 2: Update existing rows
UPDATE "User" SET "role" = 'ADMIN' WHERE "role"::text = 'OWNER';
UPDATE "User" SET "role" = 'RECEPTIONIST' WHERE "role"::text = 'MANAGER';

-- Step 3: Update default value
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
