/**
 * One-time script: reset accidental admin roles on company users.
 * Only users belonging to "CarbonTrack Administration" company should be admins.
 * Run: node scripts/fix-user-roles.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'elitebook',
  database: 'carbontrack',
});

async function fixRoles() {
  const client = await pool.connect();
  try {
    // Get CarbonTrack Administration company ID
    const { rows: [company] } = await client.query(
      `SELECT id FROM companies WHERE name = 'CarbonTrack Administration' LIMIT 1`
    );
    if (!company) {
      console.error('❌ "CarbonTrack Administration" company not found. Run seed-admin.js first.');
      return;
    }
    console.log(`✅ CarbonTrack Administration company ID: ${company.id}`);

    // Show who will be affected
    const { rows: affected } = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, c.name AS company_name
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.role = 'admin' AND u.company_id != $1`,
      [company.id]
    );

    if (affected.length === 0) {
      console.log('✅ No accidental admin roles found. Nothing to fix.');
      return;
    }

    console.log(`\n⚠️  Found ${affected.length} user(s) with incorrect admin role:`);
    affected.forEach(u => {
      console.log(`   - [${u.id}] ${u.first_name} ${u.last_name} (${u.email}) @ ${u.company_name}`);
    });

    // Reset them to 'user'
    const { rowCount } = await client.query(
      `UPDATE users SET role = 'user', updated_at = NOW()
       WHERE role = 'admin' AND company_id != $1`,
      [company.id]
    );

    console.log(`\n✅ Reset ${rowCount} user(s) from 'admin' → 'user'.`);

    // Confirm remaining admins
    const { rows: admins } = await client.query(
      `SELECT u.email, c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE u.role = 'admin'`
    );
    console.log(`\n👑 Remaining admins (${admins.length}):`);
    admins.forEach(a => console.log(`   - ${a.email} @ ${a.company_name}`));

  } finally {
    client.release();
    await pool.end();
  }
}

fixRoles().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
