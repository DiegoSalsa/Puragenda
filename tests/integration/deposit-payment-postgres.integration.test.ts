import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// This suite is deliberately opt-in. Set TEST_DATABASE_URL to an isolated
// PostgreSQL database; it never falls back to DATABASE_URL.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
const tableName = `deposit_race_${Date.now()}_${process.pid}`;

describePostgres("deposit conditional updates on PostgreSQL", () => {
  const pool = new pg.Pool({ connectionString: testDatabaseUrl });

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE "${tableName}" (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        payment_status TEXT NOT NULL
      )
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await pool.end();
  });

  it("permits only one concurrent PENDING → APPROVED confirmation", async () => {
    await pool.query(`INSERT INTO "${tableName}" VALUES ('appointment-1', 'AWAITING_PAYMENT', 'PENDING')`);
    const first = await pool.connect();
    const second = await pool.connect();
    try {
      await first.query("BEGIN");
      await second.query("BEGIN");
      const firstResult = await first.query(`
        UPDATE "${tableName}"
        SET status = 'CONFIRMED', payment_status = 'APPROVED'
        WHERE id = 'appointment-1' AND status <> 'CANCELLED' AND payment_status = 'PENDING'
        RETURNING id
      `);
      const secondResult = second.query(`
        UPDATE "${tableName}"
        SET status = 'CONFIRMED', payment_status = 'APPROVED'
        WHERE id = 'appointment-1' AND status <> 'CANCELLED' AND payment_status = 'PENDING'
        RETURNING id
      `);
      await first.query("COMMIT");

      expect(firstResult.rowCount).toBe(1);
      expect((await secondResult).rowCount).toBe(0);
      await second.query("COMMIT");
    } finally {
      first.release();
      second.release();
    }
  });

  it("keeps a cancelled reservation cancelled when approval arrives later", async () => {
    await pool.query(`INSERT INTO "${tableName}" VALUES ('appointment-2', 'AWAITING_PAYMENT', 'PENDING')`);
    const cancelled = await pool.query(`
      UPDATE "${tableName}"
      SET status = 'CANCELLED'
      WHERE id = 'appointment-2' AND status <> 'CANCELLED' AND payment_status <> 'APPROVED'
      RETURNING id
    `);
    const confirmed = await pool.query(`
      UPDATE "${tableName}"
      SET status = 'CONFIRMED', payment_status = 'APPROVED'
      WHERE id = 'appointment-2' AND status <> 'CANCELLED' AND payment_status = 'PENDING'
      RETURNING id
    `);
    const audited = await pool.query(`
      UPDATE "${tableName}"
      SET payment_status = 'APPROVED'
      WHERE id = 'appointment-2' AND status = 'CANCELLED' AND payment_status = 'PENDING'
      RETURNING id
    `);

    expect(cancelled.rowCount).toBe(1);
    expect(confirmed.rowCount).toBe(0);
    expect(audited.rowCount).toBe(1);
    await expect(pool.query(`SELECT status, payment_status FROM "${tableName}" WHERE id = 'appointment-2'`))
      .resolves.toMatchObject({ rows: [{ status: "CANCELLED", payment_status: "APPROVED" }] });
  });
});
