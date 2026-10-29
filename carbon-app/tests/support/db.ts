import './env'
import { Pool } from 'pg'

// Direct DB access for test setup/assertions only — the app under test is always driven over HTTP.
export const db = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, max: 3 }
    : {
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'carbontrack',
        max: 3,
      },
)

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.query(sql, params)).rows[0] as T
}
