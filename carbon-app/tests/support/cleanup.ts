import fs from 'node:fs'
import path from 'node:path'
import { db } from './db'
import { QA_DOMAIN } from './data'

const APP = path.join(__dirname, '..', '..')

/** Delete companies (cascades users, sites, bilans, entries, requests, documents) and their files. */
export async function deleteCompanies(ids: number[]) {
  if (!ids.length) return
  const { rows } = await db.query<{ id: number }>(
    'SELECT a.id FROM assessments a JOIN sites s ON s.id = a.site_id WHERE s.company_id = ANY($1)', [ids])
  for (const { id } of rows) fs.rmSync(path.join(APP, 'uploads', String(id)), { recursive: true, force: true })
  const logos = path.join(APP, 'public', 'logos')
  if (fs.existsSync(logos)) {
    for (const f of fs.readdirSync(logos)) {
      if (ids.some(id => f.startsWith(`company-${id}-`) || f.startsWith(`company-${id}.`))) fs.rmSync(path.join(logos, f), { force: true })
    }
  }
  // Sites first: assessments.created_by → users has no cascade, so bilans must go before the users do
  await db.query('DELETE FROM certification_requests WHERE company_id = ANY($1)', [ids])
  await db.query('DELETE FROM sites WHERE company_id = ANY($1)', [ids])
  await db.query('DELETE FROM companies WHERE id = ANY($1)', [ids])
}

/** Remove every company created by earlier runs (all QA users share QA_DOMAIN). */
export async function deleteStaleQaData() {
  const { rows } = await db.query<{ company_id: number }>(
    `SELECT DISTINCT company_id FROM users WHERE email LIKE $1 AND company_id IS NOT NULL`, [`%@${QA_DOMAIN}`])
  await deleteCompanies(rows.map(r => r.company_id))
  // Admin/expert notifications pointing at deleted requests
  await db.query(`DELETE FROM notifications n USING users u WHERE u.id = n.user_id AND u.email LIKE $1`, [`%@${QA_DOMAIN}`])
  // Factors imported by tests/api/factors.spec.ts ("qa_" ids)
  await db.query(`DELETE FROM emission_factor_changes WHERE factor_id LIKE 'qa\\_%'`)
  await db.query(`DELETE FROM emission_factors WHERE id LIKE 'qa\\_%'`)
}
