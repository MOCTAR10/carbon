const fs = require('fs')
const path = require('path')

// Load .env.local like Next.js does
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}

const { Pool } = require('pg')
const p = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'carbontrack',
})

async function run() {
  try {
    // Fix rccm column length
    await p.query("ALTER TABLE companies ALTER COLUMN rccm TYPE VARCHAR(50)")
    console.log('DONE: companies.rccm altered to VARCHAR(50)')

    const r1 = await p.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='companies' ORDER BY ordinal_position")
    console.log('companies:', r1.rows.map(x => `${x.column_name}(${x.data_type}${x.character_maximum_length ? ':' + x.character_maximum_length : ''})`).join(', '))
  } catch (e) {
    console.error('ERR:', e.message)
  }
  p.end()
}
run()
