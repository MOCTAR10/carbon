import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('cnc')
    if (!session || session.role !== 'cnc') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const result = await query(`
      SELECT cr.id, cr.status, cr.certificate_number, cr.certified_at,
             cr.submitted_to_ogec_at, cr.cnc_reviewed_at, cr.cnc_certificate_generated_at,
             cr.cnc_notes,
             a.name as assessment_name, a.year as assessment_year,
             a.total_co2eq,
             s.name as site_name,
             c.id as company_id, c.name as company_name
      FROM certification_requests cr
      JOIN assessments a ON cr.assessment_id = a.id
      JOIN sites s ON a.site_id = s.id
      JOIN companies c ON cr.company_id = c.id
      WHERE cr.cnc_user_id = $1
        AND cr.status IN ('submitted_to_cnc', 'certificate_generated')
      ORDER BY cr.submitted_to_ogec_at DESC NULLS LAST
    `, [session.userId])

    const certifications = result.rows.map(r => ({
      id: r.id,
      status: r.status,
      certificateNumber: r.certificate_number,
      certifiedAt: r.certified_at,
      submittedToCncAt: r.submitted_to_ogec_at,
      cncReviewedAt: r.cnc_reviewed_at,
      cncCertificateGeneratedAt: r.cnc_certificate_generated_at,
      cncNotes: r.cnc_notes,
      assessmentName: r.assessment_name,
      assessmentYear: r.assessment_year,
      totalCo2eq: parseFloat(r.total_co2eq || 0),
      siteName: r.site_name,
      companyId: r.company_id,
      companyName: r.company_name,
    }))

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('CNC certifications error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
