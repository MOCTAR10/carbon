import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const companyId = session.companyId

    const [
      companyRes,
      sitesRes,
      assessmentsRes,
      certRes,
      subRes,
    ] = await Promise.all([
      // Company info + logo
      query(
        `SELECT id, name, sector, logo_url, rccm FROM companies WHERE id = $1`,
        [companyId]
      ),
      // Sites with assessment counts (single JOIN instead of correlated subquery)
      query(
        `SELECT s.id, s.name, s.type, s.country,
                COUNT(a.id)::int AS assessment_count
         FROM sites s
         LEFT JOIN assessments a ON a.site_id = s.id
         WHERE s.company_id = $1
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [companyId]
      ),
      // All assessments with scope totals
      query(
        `SELECT a.id, a.name, a.year, a.status, a.created_at,
                a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
                s.name AS site_name, s.country AS site_country
         FROM assessments a
         JOIN sites s ON a.site_id = s.id
         WHERE s.company_id = $1
         ORDER BY a.created_at DESC`,
        [companyId]
      ),
      // Certification requests with status
      query(
        `SELECT cr.id, cr.status, cr.requested_at, cr.certified_at,
                cr.certificate_number, cr.expert_name,
                a.name AS assessment_name, a.year AS assessment_year
         FROM certification_requests cr
         JOIN assessments a ON a.id = cr.assessment_id
         JOIN sites s ON s.id = a.site_id
         WHERE cr.company_id = $1
         ORDER BY cr.requested_at DESC`,
        [companyId]
      ),
      // Active subscription
      query(
        `SELECT id, plan, amount, status, expires_at
         FROM subscriptions
         WHERE company_id = $1 AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [companyId]
      ),
    ])

    const company = companyRes.rows[0]
    const sites = sitesRes.rows
    const assessments = assessmentsRes.rows
    const certifications = certRes.rows
    const subscription = subRes.rows[0] ?? null

    // Aggregate totals server-side
    const totalCo2eq  = assessments.reduce((s, a) => s + (parseFloat(a.total_co2eq)  || 0), 0)
    const totalScope1 = assessments.reduce((s, a) => s + (parseFloat(a.scope1_co2eq) || 0), 0)
    const totalScope2 = assessments.reduce((s, a) => s + (parseFloat(a.scope2_co2eq) || 0), 0)
    const totalScope3 = assessments.reduce((s, a) => s + (parseFloat(a.scope3_co2eq) || 0), 0)

    // Emissions by country (server-side)
    const byCountry: Record<string, number> = {}
    for (const a of assessments) {
      const c = a.site_country || 'Inconnu'
      byCountry[c] = (byCountry[c] || 0) + (parseFloat(a.total_co2eq) || 0)
    }

    // Certification counts
    const certCounts = {
      pending:    certifications.filter(c => c.status === 'pending').length,
      inProgress: certifications.filter(c => ['assigned', 'in_progress', 'audit_done'].includes(c.status)).length,
      atCnc:      certifications.filter(c => c.status === 'submitted_to_cnc').length,
      certified:  certifications.filter(c => c.status === 'certified').length,
      rejected:   certifications.filter(c => c.status === 'rejected').length,
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        sector: company.sector,
        rccm: company.rccm,
        logoUrl: company.logo_url || null,
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        amount: subscription.amount,
        status: subscription.status,
        expiresAt: subscription.expires_at,
      } : null,
      totals: { totalCo2eq, totalScope1, totalScope2, totalScope3 },
      byCountry,
      sites,
      assessments,
      certifications,
      certCounts,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
