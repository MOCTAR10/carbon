import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyAllAdmins, notifyAllCnc } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// GET: List all certification requests for the company
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const result = await query(
      `SELECT cr.*, 
              a.name as assessment_name, a.year as assessment_year, 
              a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
              s.name as site_name
       FROM certification_requests cr
       JOIN assessments a ON cr.assessment_id = a.id
       JOIN sites s ON a.site_id = s.id
       WHERE cr.company_id = $1
       ORDER BY cr.requested_at DESC`,
      [session.companyId]
    )

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
          totalCo2eq: parseFloat(cert.total_co2eq),
          scope1: parseFloat(cert.scope1_co2eq),
          scope2: parseFloat(cert.scope2_co2eq),
          scope3: parseFloat(cert.scope3_co2eq),
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
          auditScheduledDate: cert.audit_scheduled_date,
          auditLocation: cert.audit_location,
          inspectionConfirmed: cert.inspection_confirmed ?? false,
          inspectionProposedDate: cert.inspection_proposed_date,
          inspectionProposedBy: cert.inspection_proposed_by,
          submittedToOgecAt: cert.submitted_to_ogec_at,
          ogecReference: cert.ogec_reference,
          avisNumber: cert.avis_number,
          avisDate: cert.avis_date,
          avisPdfUrl: cert.avis_pdf_url,
          avisPeriodStart: cert.avis_period_start,
          avisPeriodEnd: cert.avis_period_end,
          avisTotalCo2eq: cert.avis_total_co2eq ? parseFloat(cert.avis_total_co2eq) : null,
          expertReportPdfUrl: cert.expert_report_pdf_url,
          dossierCompiledAt: cert.dossier_compiled_at,
          documents: certDocs.map(d => ({
            id: d.id,
            docType: d.doc_type,
            originalName: d.original_name,
            fileSize: d.file_size,
            mimeType: d.mime_type,
            createdAt: d.created_at,
          })),
        }
      })

    return NextResponse.json(certifications)
  } catch (error) {
    console.error('Certifications list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Request certification for an assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { assessmentId, message } = await request.json()

    if (!assessmentId) {
      return NextResponse.json({ error: 'ID du bilan requis' }, { status: 400 })
    }

    // Verify the assessment belongs to this company
    const assessment = await query(
      `SELECT a.id, a.name, a.total_co2eq, s.company_id 
       FROM assessments a JOIN sites s ON a.site_id = s.id 
       WHERE a.id = $1 AND s.company_id = $2`,
      [assessmentId, session.companyId]
    )

    if (assessment.rows.length === 0) {
      return NextResponse.json({ error: 'Bilan non trouve' }, { status: 404 })
    }

    // Check if there's already a pending/in_progress/certified request
    const existing = await query(
      `SELECT id, status FROM certification_requests 
       WHERE assessment_id = $1 AND status IN ('pending', 'assigned', 'in_progress', 'certified')`,
      [assessmentId]
    )

    if (existing.rows.length > 0) {
      const s = existing.rows[0].status
      if (s === 'certified') {
        return NextResponse.json({ error: 'Ce bilan est deja certifie' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Une demande de certification est deja en cours pour ce bilan' }, { status: 409 })
    }

    // Create the certification request
    const result = await query(
      `INSERT INTO certification_requests (assessment_id, company_id, status, company_message)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [assessmentId, session.companyId, message || null]
    )

    const newCertId = result.rows[0].id
    const assessmentName = assessment.rows[0].name

    // Notify all admins and CNC about the new request
    await notifyAllAdmins(
      'cert_request',
      'Nouvelle demande de certification',
      `${assessmentName} — demande soumise par l'entreprise`,
      `/admin/certifications/${newCertId}`
    )
    await notifyAllCnc(
      'cert_request',
      'Nouveau dossier à certifier',
      `${assessmentName} — nouvelle demande soumise par l'entreprise`,
      `/cnc/certifications/${newCertId}`
    )

    return NextResponse.json({
      success: true,
      message: 'Demande de certification envoyee avec succes',
      certification: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        requestedAt: result.rows[0].requested_at,
      },
    })
  } catch (error) {
    console.error('Certification request error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
