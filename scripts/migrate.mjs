// Apply the schema: init-db.sql, then every migrate-*.sql in filename alpha order.
// There is no version table — every script must stay idempotent (IF NOT EXISTS, ON CONFLICT…).
// Usage: node scripts/migrate.mjs            (uses DATABASE_URL or PG* env vars)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const dir = path.dirname(fileURLToPath(import.meta.url))
const files = ['init-db.sql', ...fs.readdirSync(dir).filter(f => /^migrate-.*\.sql$/.test(f)).sort()]

const client = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'carbontrack',
      },
)

await client.connect()
client.on('notice', n => console.log(`   notice: ${n.message}`))
try {
  for (const f of files) {
    process.stdout.write(`-> ${f}\n`)
    await client.query(fs.readFileSync(path.join(dir, f), 'utf8'))
  }
  console.log(`OK: ${files.length} scripts applied`)
} catch (err) {
  console.error(`FAILED: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
