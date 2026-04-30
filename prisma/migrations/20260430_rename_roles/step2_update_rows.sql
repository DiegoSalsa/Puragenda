-- Step 2: Update existing rows and default (run AFTER step1 is committed)
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'OWNER';
UPDATE "User" SET "role" = 'RECEPTIONIST' WHERE "role" = 'MANAGER';
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
