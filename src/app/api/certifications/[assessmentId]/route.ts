import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession as getSession, parseId } from '@/lib/company'

export const dynamic = 'force-dynamic'

// GET: Get certification status for a specific assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const assessmentId = parseId(params.assessmentId)
    if (!assessmentId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const result = await query(
      `SELECT cr.*, 
              a.name as assessment_name
       FROM certification_requests cr
       JOIN assessments a ON cr.assessment_id = a.id
       JOIN sites s ON a.site_id = s.id
       WHERE cr.assessment_id = $1 AND s.company_id = $2
       ORDER BY cr.requested_at DESC
       LIMIT 1`,
      [assessmentId, session.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ certification: null })
    }

    const cert = result.rows[0]

    // Get documents
    const docs = await query(
      `SELECT id, doc_type, original_name, file_size, mime_type, created_at 
       FROM certification_documents WHERE certification_id = $1 ORDER BY created_at DESC`,
      [cert.id]
    )

    return NextResponse.json({
      certification: {
        id: cert.id,
        status: cert.status,
        expertName: cert.expert_name,
        inspectionDate: cert.inspection_date,
        certifiedAt: cert.status === 'certified' ? cert.certified_at : null,
        certificateNumber: cert.status === 'certified' ? cert.certificate_number : null,
        companyMessage: cert.company_message,
        adminNotes: null, // internal admin notes are never sent to the company
        rejectionReason: cert.rejection_reason,
        requestedAt: cert.requested_at,
        auditScheduledDate: cert.audit_scheduled_date,
        auditLocation: cert.audit_location,
        submittedToCncAt: cert.submitted_to_cnc_at,
        cncDepositReference: cert.cnc_deposit_reference,
        documents: docs.rows.map(d => ({
          id: d.id,
          docType: d.doc_type,
          originalName: d.original_name,
          fileSize: d.file_size,
          mimeType: d.mime_type,
          createdAt: d.created_at,
        })),
      },
    })
  } catch (error) {
    console.error('Certification check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
