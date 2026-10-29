import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function GET() {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const result = await query(`
      SELECT cr.*,
             a.name as assessment_name, a.year as assessment_year,
             a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
             s.name as site_name,
             c.id as company_id, c.name as company_name
      FROM certification_requests cr
      JOIN assessments a ON cr.assessment_id = a.id
      JOIN sites s ON a.site_id = s.id
      JOIN companies c ON cr.company_id = c.id
      ORDER BY cr.requested_at DESC
    `)

    // Batch-fetch all documents in one query then group in memory
    const certIds = result.rows.map((r: { id: number }) => r.id)
    let docsMap: Record<number, Record<string, unknown>[]> = {}
    if (certIds.length > 0) {
      const docsResult = await query(
        `SELECT id, certification_id, doc_type, original_name, file_size, mime_type, created_at
         FROM certification_documents
         WHERE certification_id = ANY($1::int[])
         ORDER BY created_at DESC`,
        [certIds]
      )
      for (const d of docsResult.rows) {
        if (!docsMap[d.certification_id]) docsMap[d.certification_id] = []
        docsMap[d.certification_id].push(d)
      }
    }

    const certifications = result.rows.map((cert) => {
      const certDocs = docsMap[cert.id] ?? []
      return {
        id: cert.id,
        assessmentId: cert.assessment_id,
        assessmentName: cert.assessment_name,
        assessmentYear: cert.assessment_year,
        siteName: cert.site_name,
        totalCo2eq: parseFloat(cert.total_co2eq || 0),
        scope1: parseFloat(cert.scope1_co2eq || 0),
        scope2: parseFloat(cert.scope2_co2eq || 0),
        scope3: parseFloat(cert.scope3_co2eq || 0),
        status: cert.status,
        expertName: cert.expert_name,
        expertEmail: cert.expert_email,
        inspectionDate: cert.inspection_date,
        inspectionNotes: cert.inspection_notes,
        companyMessage: cert.company_message,
        adminNotes: cert.admin_notes,
        rejectionReason: cert.rejection_reason,
        certifiedAt: cert.certified_at,
        certificateNumber: cert.certificate_number,
        requestedAt: cert.requested_at,
        company: { id: cert.company_id, name: cert.company_name },
        documents: certDocs.map(d => ({
          id: d.id,
          docType: d.doc_type,
          originalName: d.original_name,
          fileSize: d.file_size,
          createdAt: d.created_at,
        })),
      }
    })

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Admin certifications error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
