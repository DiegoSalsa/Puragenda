import "dotenv/config";
import pg from "pg";
import bcrypt from "bcrypt";

/**
 * Script seguro que SOLO crea/actualiza la cuenta de admin.
 * NO borra ningún dato existente.
 */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const email = "contacto@purocode.com";
  const password = "1234";
  const hashedPassword = await bcrypt.hash(password, 12);

  // Check if user already exists
  const existing = await pool.query(`SELECT id, email, "isSuperAdmin" FROM "User" WHERE email = $1`, [email]);

  if (existing.rows.length > 0) {
    // Update to ensure isSuperAdmin is true
    await pool.query(
      `UPDATE "User" SET "isSuperAdmin" = true, role = 'SUPERADMIN', password = $1 WHERE email = $2`,
      [hashedPassword, email]
    );
    console.log(`✅ Usuario ${email} actualizado como SuperAdmin`);
  } else {
    // Create new admin user
    await pool.query(
      `INSERT INTO "User" (id, email, password, name, role, "isSuperAdmin", "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, 'PuroCode Admin', 'SUPERADMIN', true, NOW(), NOW())`,
      [email, hashedPassword]
    );
    console.log(`✅ Usuario ${email} creado como SuperAdmin`);
  }

  console.log(`\n🔐 Credenciales:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);

  await pool.end();
}

main().catch(console.error);
