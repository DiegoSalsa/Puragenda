-- Step 2: Migrate existing data
UPDATE "Subscription" SET "plan" = 'EQUIPO' WHERE "plan" = 'BASIC';
UPDATE "Subscription" SET "plan" = 'EQUIPO' WHERE "plan" = 'PRO';
