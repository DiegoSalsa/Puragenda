-- Allow each service option category to define how many alternatives can be selected.
ALTER TABLE "ServiceOptionCategory" ADD COLUMN "maxSelections" INTEGER NOT NULL DEFAULT 1;
