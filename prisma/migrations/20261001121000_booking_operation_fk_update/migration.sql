-- Match Prisma's relation semantics without changing the original migration.
ALTER TABLE "BookingOperation" DROP CONSTRAINT "BookingOperation_businessId_fkey";
ALTER TABLE "BookingOperation" ADD CONSTRAINT "BookingOperation_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
