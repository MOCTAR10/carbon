import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('expert')
    if (!session || session.role !== 'expert') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const result = await query(
      `SELECT
         cr.id, cr.status, cr.requested_at, cr.updated_at,
         cr.inspection_notes, cr.certified_at, cr.certificate_number,
         cr.rejection_reason, cr.admin_notes, cr.inspection_date,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
         s.name as site_name, s.type as site_type,
         c.id as company_id, c.name as company_name, c.sector
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.expert_user_id = $1
       ORDER BY cr.updated_at DESC`,
      [session.userId]
    )

    return NextResponse.json(result.rows.map(r => ({
      id: r.id,
      status: r.status,
      requestedAt: r.requested_at,
      updatedAt: r.updated_at,
      inspectionDate: r.inspection_date,
      inspectionNotes: r.inspection_notes,
      certifiedAt: r.certified_at,
      certificateNumber: r.certificate_number,
      rejectionReason: r.rejection_reason,
      adminNotes: r.admin_notes,
      assessmentId: r.assessment_id,
      assessmentName: r.assessment_name,
      assessmentYear: r.assessment_year,
      totalCo2eq: r.total_co2eq,
      scope1: r.scope1_co2eq,
      scope2: r.scope2_co2eq,
      scope3: r.scope3_co2eq,
      siteName: r.site_name,
      siteType: r.site_type,
      companyId: r.company_id,
      companyName: r.company_name,
      sector: r.sector,
    })))
  } catch (error) {
    console.error('Expert certifications error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
