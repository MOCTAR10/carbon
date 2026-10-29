import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { certNumber: string } }) {
  try {
    const { certNumber } = params

    const result = await query(
      `SELECT
         cr.id, cr.status, cr.certificate_number, cr.certified_at,
         cr.expert_name, cr.expert_email, cr.inspection_date, cr.audit_location,
         cr.cnc_certificate_number, cr.cnc_certificate_generated_at,
         cr.avis_number, cr.avis_date,
         cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq, a.approach,
         c.id as company_id, c.name as company_name, c.sector, c.rccm, c.logo_url,
         s.name as site_name, s.type as site_type, s.address as site_address
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.certificate_number = $1 OR cr.cnc_certificate_number = $1`,
      [certNumber]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Certificat introuvable' }, { status: 404 })
    }

    const r = result.rows[0]

    // Top emission sources
    const entriesResult = await query(
      `SELECT category, scope, SUM(total_co2eq) AS total_co2eq
       FROM emission_entries
       WHERE assessment_id = $1
       GROUP BY category, scope
       ORDER BY SUM(total_co2eq) DESC
       LIMIT 10`,
      [r.assessment_id]
    )

    const topSources = entriesResult.rows.map((e: any) => ({
      category: e.category,
      scope: e.scope,
      totalCo2eq: parseFloat(e.total_co2eq ?? 0),
    }))

    return NextResponse.json({
      id: r.id,
      status: r.status,
      certificateNumber: r.certificate_number,
      certifiedAt: r.certified_at,
      expertName: r.expert_name,
      expertEmail: r.expert_email,
      inspectionDate: r.inspection_date,
      auditLocation: r.audit_location,
      cncCertificateNumber: r.cnc_certificate_number,
      cncCertificateGeneratedAt: r.cnc_certificate_generated_at,
      avisNumber: r.avis_number,
      avisDate: r.avis_date,
      avisPeriodStart: r.avis_period_start,
      avisPeriodEnd: r.avis_period_end,
      avisTotalCo2eq: r.avis_total_co2eq ? parseFloat(r.avis_total_co2eq) : null,
      assessmentName: r.assessment_name,
      assessmentYear: r.assessment_year,
      approach: r.approach,
      totalCo2eq: parseFloat(r.total_co2eq ?? 0),
      scope1: parseFloat(r.scope1_co2eq ?? 0),
      scope2: parseFloat(r.scope2_co2eq ?? 0),
      scope3: parseFloat(r.scope3_co2eq ?? 0),
      companyName: r.company_name,
      companySector: r.sector,
      companyRccm: r.rccm,
      companyLogoUrl: r.logo_url,
      siteName: r.site_name,
      siteType: r.site_type,
      siteAddress: r.site_address,
      topSources,
    })
  } catch (error) {
    console.error('Verification API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
