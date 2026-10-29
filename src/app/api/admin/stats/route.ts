import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('admin')
    if (!session) return NextResponse.json({ error: 'Non authentifiÃ©' }, { status: 401 })

    const userResult = await query('SELECT role FROM users WHERE id = $1', [session.userId])
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })
    }

    const [
      companiesResult,
      usersResult,
      assessmentsResult,
      emissionsResult,
      certificationsResult,
      glCertificationsResult,
      certStatusResult,
      expertsResult,
      recentCompaniesResult,
      recentCertsResult,
      expertWorkloadResult,
      cncStatsResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM companies`),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'user'`),
      query(`SELECT COUNT(*) AS count FROM assessments`),
      query(`SELECT COALESCE(SUM(total_co2eq), 0) AS total FROM assessments`),
      query(`SELECT COUNT(*) AS count FROM certification_requests`),
      query(`SELECT COUNT(*) AS count FROM certification_requests WHERE status = 'certified'`),
      query(`SELECT status, COUNT(*) AS count FROM certification_requests GROUP BY status`),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'expert'`),
      // Recent companies
      query(`
        SELECT c.id, c.name, c.sector, c.created_at,
               COUNT(DISTINCT u.id)::int AS user_count,
               COUNT(DISTINCT a.id)::int AS assessment_count
        FROM companies c
        LEFT JOIN users u ON u.company_id = c.id
        LEFT JOIN sites si ON si.company_id = c.id
        LEFT JOIN assessments a ON a.site_id = si.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 8
      `),
      // Recent certification requests
      query(`
        SELECT cr.id, cr.status, cr.requested_at, cr.updated_at,
               cr.certificate_number, cr.expert_name,
               a.name AS assessment_name, a.year AS assessment_year,
               c.name AS company_name, c.sector AS company_sector
        FROM certification_requests cr
        JOIN assessments a ON a.id = cr.assessment_id
        JOIN sites s ON s.id = a.site_id
        JOIN companies c ON c.id = cr.company_id
        ORDER BY cr.updated_at DESC
        LIMIT 8
      `),
      // Expert workload
      query(`
        SELECT u.first_name || ' ' || u.last_name AS expert_name,
               COUNT(cr.id)::int                  AS total,
               COUNT(cr.id) FILTER (WHERE cr.status IN ('assigned','in_progress'))::int AS active
        FROM users u
        LEFT JOIN certification_requests cr ON cr.expert_user_id = u.id
        WHERE u.role = 'expert'
        GROUP BY u.id
        ORDER BY active DESC
        LIMIT 5
      `),
      // CNC workflow stats
      query(`
        SELECT
          COUNT(*) FILTER (WHERE cr.status = 'submitted_to_cnc')        AS cnc_pending,
          COUNT(*) FILTER (WHERE cr.status = 'certificate_generated')   AS cnc_completed,
          COUNT(*) FILTER (WHERE cr.status IN ('submitted_to_cnc','certificate_generated')) AS cnc_total
        FROM certification_requests cr
      `),
    ])

    return NextResponse.json({
      companies:          parseInt(companiesResult.rows[0].count),
      users:              parseInt(usersResult.rows[0].count),
      assessments:        parseInt(assessmentsResult.rows[0].count),
      totalEmissions:     parseFloat(emissionsResult.rows[0].total),
      certifications:     parseInt(certificationsResult.rows[0].count),
      glCertifications:   parseInt(glCertificationsResult.rows[0].count),
      experts:            parseInt(expertsResult.rows[0].count),
      certByStatus: Object.fromEntries(
        certStatusResult.rows.map((r: { status: string; count: string }) => [r.status, parseInt(r.count)])
      ),
      recentCompanies: recentCompaniesResult.rows.map(c => ({
        id:              c.id,
        name:            c.name,
        sector:          c.sector,
        createdAt:       c.created_at,
        userCount:       c.user_count,
        assessmentCount: c.assessment_count,
      })),
      recentCerts: recentCertsResult.rows.map(r => ({
        id:              r.id,
        status:          r.status,
        requestedAt:     r.requested_at,
        updatedAt:       r.updated_at,
        certificateNumber: r.certificate_number,
        expertName:      r.expert_name,
        assessmentName:  r.assessment_name,
        assessmentYear:  r.assessment_year,
        companyName:     r.company_name,
        companySector:   r.company_sector,
      })),
      expertWorkload: expertWorkloadResult.rows,
      cncStats: {
        pending:   parseInt(cncStatsResult.rows[0].cnc_pending),
        completed: parseInt(cncStatsResult.rows[0].cnc_completed),
        total:     parseInt(cncStatsResult.rows[0].cnc_total),
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
