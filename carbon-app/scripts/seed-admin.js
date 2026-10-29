/**
 * Creates an admin user directly in the database.
 * Run with: node scripts/seed-admin.js
 */

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Prefer DATABASE_URL (production); fall back to localhost defaults for dev convenience.
// In production, load env first:  set -a && source .env.local && set +a && node scripts/seed-admin.js
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host:     process.env.PGHOST     || 'localhost',
      port:     parseInt(process.env.PGPORT) || 5432,
      user:     process.env.PGUSER     || 'postgres',
      password: process.env.PGPASSWORD || 'elitebook',
      database: process.env.PGDATABASE || 'carbontrack',
    })

async function seedAdmin() {
  const client = await pool.connect()
  try {
    // Admin credentials — change these as needed
    const ADMIN_EMAIL     = 'admin@carbontrack.com'
    const ADMIN_PASSWORD  = 'Admin@2026!'
    const ADMIN_FIRSTNAME = 'Admin'
    const ADMIN_LASTNAME  = 'CarbonTrack'
    const ADMIN_PHONE     = '+242000000000'
    const COMPANY_NAME    = 'CarbonTrack Administration'

    console.log('🌱 Seeding admin user...\n')

    // Check if already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL])
    if (existing.rows.length > 0) {
      console.log(`⚠️  User "${ADMIN_EMAIL}" already exists.`)
      console.log('   If you need to reset the password, run:')
      console.log(`   UPDATE users SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';`)
      return
    }

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, rccm, sector)
       VALUES ($1, 'ADMIN-001', 'services')
       RETURNING id`,
      [COMPANY_NAME]
    )
    const companyId = companyResult.rows[0].id
    console.log(`✅ Company created: ${COMPANY_NAME} (id=${companyId})`)

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, company_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin')
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRSTNAME, ADMIN_LASTNAME, ADMIN_PHONE, companyId]
    )
    const userId = userResult.rows[0].id
    console.log(`✅ Admin user created: ${ADMIN_EMAIL} (id=${userId})`)

    // Create a long-lived subscription for the admin company
    await client.query(
      `INSERT INTO subscriptions (company_id, plan, amount, currency, payment_method, payment_ref, status, starts_at, expires_at)
       VALUES ($1, 'admin', 0, 'FCFA', 'admin', 'ADMIN-FREE', 'active', NOW(), NOW() + INTERVAL '10 years')`,
      [companyId]
    )
    console.log(`✅ Admin subscription created (10 years)`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Admin account ready!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`  URL:       http://localhost:3000/login`)
    console.log(`  Email:     ${ADMIN_EMAIL}`)
    console.log(`  Password:  ${ADMIN_PASSWORD}`)
    console.log(`  Admin URL: http://localhost:3000/admin`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

seedAdmin()
