-- Pivot subscription plans: BASIC → EQUIPO, remove PRO

-- Step 1: Add new EQUIPO value to the enum (must be in separate transaction)
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'EQUIPO';

-- Step 2: Migrate existing data (run after step 1 commits)
-- These were executed via step2.sql separately
-- UPDATE "Subscription" SET "plan" = 'EQUIPO' WHERE "plan" = 'BASIC';
-- UPDATE "Subscription" SET "plan" = 'EQUIPO' WHERE "plan" = 'PRO';

-- Note: Old values BASIC and PRO remain in the PostgreSQL enum type
-- but are no longer referenced by any application code or data.
-- PostgreSQL does not support DROP VALUE from enums without recreation.
