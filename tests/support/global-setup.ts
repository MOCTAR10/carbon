import bcrypt from 'bcryptjs'
import { db } from './db'
import { ADMIN, EXPERT } from './data'
import { deleteStaleQaData } from './cleanup'

// Seeds the staff accounts the certification flow needs and clears leftovers from previous runs.
// Companies are NOT seeded here: each test registers its own through the public API (fixtures.ts).
export default async function globalSetup() {
  await deleteStaleQaData()
  const hash = await bcrypt.hash(ADMIN.password, 10)
  for (const [u, role] of [[ADMIN, 'admin'], [EXPERT, 'expert']] as const) {
    await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [u.email, hash, u.firstName, u.lastName, role],
    )
  }
  await db.end()
}
