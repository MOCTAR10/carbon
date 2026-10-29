import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('admin')
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const result = await query(`
      SELECT
        cr.id,
        cr.status,
        cr.audit_scheduled_date,
        cr.audit_location,
        cr.inspection_date,
        cr.inspection_confirmed,
        cr.inspection_proposed_date,
        cr.inspection_proposed_by,
        cr.expert_name,
        cr.expert_email,
        a.name  AS assessment_name,
        a.year  AS assessment_year,
        c.name  AS company_name,
        s.name  AS site_name,
        s.address AS site_address
      FROM certification_requests cr
      JOIN assessments a ON a.id = cr.assessment_id
      JOIN sites       s ON s.id = a.site_id
      JOIN companies   c ON c.id = cr.company_id
      WHERE cr.status NOT IN ('certified','rejected')
        AND (cr.audit_scheduled_date IS NOT NULL OR cr.inspection_proposed_date IS NOT NULL)
      ORDER BY COALESCE(cr.inspection_proposed_date, cr.audit_scheduled_date) ASC
    `)

    return NextResponse.json({ inspections: result.rows })
  } catch (err) {
    console.error('Inspections list error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
