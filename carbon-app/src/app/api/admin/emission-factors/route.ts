import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminSession, forbidden } from '@/lib/admin'
import { getAllFactors } from '@/lib/factor-library'

export const dynamic = 'force-dynamic'

/** Library for the admin page: every factor, the latest changes and how many bilans use each factor. */
export async function GET() {
  if (!(await getAdminSession())) return forbidden()
  try {
    const [factors, changes, usage] = await Promise.all([
      getAllFactors(),
      query(
        `SELECT c.id, c.factor_id, c.action, c.batch_label, c.created_at, c.before, c.after,
                NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS changed_by
         FROM emission_factor_changes c LEFT JOIN users u ON u.id = c.changed_by
         ORDER BY c.created_at DESC, c.id DESC LIMIT 50`
      ),
      query(
        `SELECT emission_factor_id AS id, COUNT(DISTINCT assessment_id)::int AS n
         FROM emission_entries WHERE emission_factor_id IS NOT NULL GROUP BY emission_factor_id`
      ),
    ])
    return NextResponse.json({
      factors,
      changes: changes.rows.map(c => ({
        id: c.id, factorId: c.factor_id, action: c.action, batchLabel: c.batch_label,
        changedBy: c.changed_by, createdAt: c.created_at, before: c.before, after: c.after,
      })),
      usage: Object.fromEntries(usage.rows.map(r => [r.id, r.n])),
    })
  } catch (err) {
    console.error('[admin/emission-factors GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
