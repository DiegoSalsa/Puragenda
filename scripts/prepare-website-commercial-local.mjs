import pg from 'pg';
// Fixed isolated cluster, never reads .env or DATABASE_URL.
const client = new pg.Client({ connectionString: 'postgresql://websiteqa@127.0.0.1:55439/websiteqa' });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(`UPDATE "Subscription" SET "currentPeriodEnd"=NOW()+INTERVAL '30 days' WHERE "businessId" IN ('website-qa-a','website-qa-b','website-qa-c')`);
  const mode = process.argv[2] || 'available';
  await client.query(`INSERT INTO "WebsiteLaunchSnapshot"(id,"launchAt","capturedAt","memberCount") VALUES ('website-qa-launch','2026-10-02T12:00:00Z',NOW(),1) ON CONFLICT(id) DO NOTHING`);
  await client.query(`INSERT INTO "WebsiteOfferEligibility"("businessId","offerCode","snapshotId","eligibleAt") VALUES ('website-qa-a','BETA_FOUNDER','website-qa-launch','2026-10-02T12:00:00Z') ON CONFLICT("businessId") DO NOTHING`);
  if (mode === 'available') {
    await client.query(`DELETE FROM "WebsiteCommercialEvent" WHERE "businessId"='website-qa-a' AND event IN ('website_trial_started','website_trial_expired')`);
    await client.query(`UPDATE "WebsiteOfferEligibility" SET "trialStartedAt"=NULL,"trialEndsAt"=NULL,"trialConsumedAt"=NULL WHERE "businessId"='website-qa-a'`);
    await client.query(`DELETE FROM "WebsiteCheckoutOperation" WHERE "addonId" IN (SELECT id FROM "WebsiteAddon" WHERE "businessId"='website-qa-a')`);
    await client.query(`UPDATE "WebsiteAddon" SET status='INACTIVE',provider='mercadopago',"mpSubscriptionId"=NULL,"validUntil"=NULL,"cancelAt"=NULL,"lastEventAt"=NULL,"lastEventId"=NULL WHERE "businessId"='website-qa-a'`);
  } else if (mode === 'expired') {
    await client.query(`UPDATE "WebsiteOfferEligibility" SET "trialStartedAt"=NOW()-INTERVAL '16 days',"trialConsumedAt"=NOW()-INTERVAL '16 days',"trialEndsAt"=NOW()-INTERVAL '1 day' WHERE "businessId"='website-qa-a'`);
    await client.query(`UPDATE "WebsiteAddon" SET status='INACTIVE',"validUntil"=NULL,"cancelAt"=NULL WHERE "businessId"='website-qa-a'`);
    await client.query(`UPDATE "WebsiteCheckoutOperation" SET "firstChargeAt"=NOW()-INTERVAL '1 day' WHERE "addonId" IN (SELECT id FROM "WebsiteAddon" WHERE "businessId"='website-qa-a')`);
  } else if (mode === 'standard') {
    await client.query(`DELETE FROM "WebsiteOfferEligibility" WHERE "businessId"='website-qa-b'`);
    await client.query(`DELETE FROM "WebsiteCheckoutOperation" WHERE "addonId" IN (SELECT id FROM "WebsiteAddon" WHERE "businessId"='website-qa-b')`);
    await client.query(`UPDATE "WebsiteAddon" SET status='INACTIVE',provider='mercadopago',"mpSubscriptionId"=NULL,"validUntil"=NULL,"cancelAt"=NULL,"lastEventAt"=NULL WHERE "businessId"='website-qa-b'`);
  } else throw new Error('Allowed modes: available, expired, standard');
  // Seed all weekdays, independent of audit execution date.
  await client.query(`INSERT INTO "StaffSchedule"(id,"staffId","dayOfWeek","startTime","endTime","isWorking") SELECT s.id||'-qa-sunday',s.id,0,'09:00','19:00',true FROM "Staff" s WHERE s."businessId" IN ('website-qa-a','website-qa-b','website-qa-c') ON CONFLICT("staffId","dayOfWeek") DO NOTHING`);
  await client.query('COMMIT');
  console.log(`Commercial fixture ${mode}: PASS isolated local PostgreSQL`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
