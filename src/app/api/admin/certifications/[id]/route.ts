import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { createNotification, notifyCompanyUsers } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

    const certId = parseInt(params.id)
    const result = await query(
      `SELECT
         cr.id, cr.status, cr.requested_at, cr.updated_at,
         cr.inspection_notes, cr.inspection_checklist, cr.certified_at, cr.certificate_number,
         cr.rejection_reason, cr.admin_notes, cr.inspection_date,
         cr.company_message, cr.expert_name, cr.expert_email, cr.expert_user_id,
         cr.audit_checklist, cr.audit_scheduled_date, cr.audit_location,
         cr.inspection_confirmed, cr.inspection_proposed_date, cr.inspection_proposed_by,
         cr.submitted_to_ogec_at, cr.ogec_reference,
          cr.avis_number, cr.avis_date, cr.avis_pdf_url,
          cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
          cr.expert_report_pdf_url, cr.dossier_compiled_at,
          cr.cnc_user_id, cr.submitted_to_cnc_at, cr.cnc_reviewed_at, cr.cnc_notes,
          cr.cnc_certificate_pdf_url, cr.cnc_certificate_generated_at, cr.cnc_certificate_number,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
         a.approach,
         s.name as site_name, s.type as site_type, s.address as site_address,
         c.id as company_id, c.name as company_name, c.sector, c.rccm
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.id = $1`,
      [certId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Certification introuvable' }, { status: 404 })
    }

    const r = result.rows[0]

    const entriesResult = await query(
      `SELECT id, scope, category, subcategory, factor_name,
              quantity, unit, factor_value, total_co2eq, month, year,
              ghg_category, description, source_characterization
       FROM emission_entries
       WHERE assessment_id = $1
       ORDER BY scope, category, factor_name`,
      [r.assessment_id]
    )

    const entries = entriesResult.rows.map(e => ({
      id: e.id,
      scope: parseInt(e.scope),
      category: e.category,
      subcategory: e.subcategory,
      factorName: e.factor_name,
      quantity: parseFloat(e.quantity) || 0,
      unit: e.unit,
      factorValue: parseFloat(e.factor_value) || 0,
      totalCo2eq: parseFloat(e.total_co2eq) || 0,
      month: parseInt(e.month) || null,
      year: parseInt(e.year) || null,
      ghgCategory: e.ghg_category,
      description: e.description,
      sourceCharacterization: e.source_characterization,
    }))

    const MONTH_LABELS = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const mes = entries.filter(e => e.month === m)
      return {
        month: m, label: MONTH_LABELS[m],
        total: mes.reduce((s, e) => s + e.totalCo2eq, 0),
        scope1: mes.filter(e => e.scope === 1).reduce((s, e) => s + e.totalCo2eq, 0),
        scope2: mes.filter(e => e.scope === 2).reduce((s, e) => s + e.totalCo2eq, 0),
        scope3: mes.filter(e => e.scope === 3).reduce((s, e) => s + e.totalCo2eq, 0),
      }
    })

    const catMap: Record<string, { total: number; scope: number; count: number }> = {}
    for (const e of entries) {
      if (!catMap[e.category]) catMap[e.category] = { total: 0, scope: e.scope, count: 0 }
      catMap[e.category].total += e.totalCo2eq
      catMap[e.category].count++
    }
    const byCategory = Object.entries(catMap)
      .map(([category, d]) => ({ category, ...d }))
      .sort((a, b) => b.total - a.total)

    const topEmitters = [...entries]
      .filter(e => e.totalCo2eq > 0)
      .sort((a, b) => b.totalCo2eq - a.totalCo2eq)
      .slice(0, 10)
      .map(e => ({ name: e.factorName, total: e.totalCo2eq, scope: e.scope, category: e.category, quantity: e.quantity, unit: e.unit, factorValue: e.factorValue }))

    const docsResult = await query(
      `SELECT id, doc_type, original_name, file_size, created_at
       FROM certification_documents WHERE certification_id = $1 ORDER BY created_at DESC`,
      [certId]
    )

    // Supporting documents uploaded by company per emission entry
    const auditDocsResult = await query(
      `SELECT ad.id, ad.emission_factor_id, ad.original_name, ad.filename,
              ad.file_size, ad.mime_type, ad.created_at,
              ee.factor_name, ee.category, ee.scope
       FROM audit_documents ad
       LEFT JOIN emission_entries ee ON ee.assessment_id = ad.assessment_id
         AND ee.emission_factor_id = ad.emission_factor_id
       WHERE ad.assessment_id = $1
       ORDER BY ee.scope, ee.category, ad.created_at DESC`,
      [r.assessment_id]
    )

    return NextResponse.json({
      id: r.id, status: r.status, requestedAt: r.requested_at, updatedAt: r.updated_at,
      inspectionDate: r.inspection_date, inspectionNotes: r.inspection_notes,
      inspectionChecklist: (() => { try { return r.inspection_checklist ? JSON.parse(r.inspection_checklist) : null } catch { return null } })(),
      auditChecklist: r.audit_checklist ?? null,
      auditScheduledDate: r.audit_scheduled_date,
      auditLocation: r.audit_location,
      inspectionConfirmed: r.inspection_confirmed ?? false,
      inspectionProposedDate: r.inspection_proposed_date,
      inspectionProposedBy: r.inspection_proposed_by,
      submittedToOgecAt: r.submitted_to_ogec_at,
      ogecReference: r.ogec_reference,
      avisNumber: r.avis_number,
      avisDate: r.avis_date,
      avisPdfUrl: r.avis_pdf_url,
      avisPeriodStart: r.avis_period_start,
      avisPeriodEnd: r.avis_period_end,
      avisTotalCo2eq: r.avis_total_co2eq ? parseFloat(r.avis_total_co2eq) : null,
      expertReportPdfUrl: r.expert_report_pdf_url,
      dossierCompiledAt: r.dossier_compiled_at,
      cncUserId: r.cnc_user_id,
      submittedToCncAt: r.submitted_to_cnc_at,
      cncReviewedAt: r.cnc_reviewed_at,
      cncNotes: r.cnc_notes,
      cncCertificatePdfUrl: r.cnc_certificate_pdf_url,
      cncCertificateGeneratedAt: r.cnc_certificate_generated_at,
      cncCertificateNumber: r.cnc_certificate_number,
      certifiedAt: r.certified_at, certificateNumber: r.certificate_number,
      rejectionReason: r.rejection_reason, adminNotes: r.admin_notes,
      companyMessage: r.company_message,
      expertName: r.expert_name, expertEmail: r.expert_email, expertUserId: r.expert_user_id,
      assessmentId: r.assessment_id, assessmentName: r.assessment_name, assessmentYear: r.assessment_year,
      approach: r.approach,
      totalCo2eq: r.total_co2eq, scope1: r.scope1_co2eq, scope2: r.scope2_co2eq, scope3: r.scope3_co2eq,
      siteName: r.site_name, siteType: r.site_type, siteAddress: r.site_address,
      companyId: r.company_id, companyName: r.company_name, sector: r.sector, rccm: r.rccm,
      entries, byMonth, byCategory, topEmitters,
      documents: docsResult.rows.map(d => ({
        id: d.id, docType: d.doc_type, originalName: d.original_name,
        fileSize: d.file_size, createdAt: d.created_at,
      })),
      auditDocuments: auditDocsResult.rows.map(d => ({
        id:          d.id,
        factorId:    d.emission_factor_id,
        factorName:  d.factor_name  ?? null,
        category:    d.category     ?? null,
        scope:       d.scope        ? parseInt(d.scope) : null,
        originalName: d.original_name,
        fileSize:    d.file_size,
        mimeType:    d.mime_type,
        createdAt:   d.created_at,
      })),
    })
  } catch (error) {
    console.error('Admin cert detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

    const certId = parseInt(params.id)
    const body = await request.json()
    const { action } = body

    if (action === 'assign') {
      const { expertUserId, inspectionDate, adminNotes } = body

      if (!expertUserId) {
        return NextResponse.json({ error: 'SÃ©lectionnez un expert' }, { status: 400 })
      }

      // Look up expert name/email from users table
      const expertResult = await query(
        `SELECT first_name, last_name, email FROM users WHERE id = $1 AND role = 'expert'`,
        [expertUserId]
      )
      if (expertResult.rows.length === 0) {
        return NextResponse.json({ error: 'Expert introuvable' }, { status: 404 })
      }
      const expert = expertResult.rows[0]

      await query(
        `UPDATE certification_requests
         SET status = 'assigned',
             expert_user_id = $1,
             expert_name = $2,
             expert_email = $3,
             audit_scheduled_date = $4,
             inspection_date = $4,
             admin_notes = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          expertUserId,
          `${expert.first_name} ${expert.last_name}`,
          expert.email,
          inspectionDate || null,
          adminNotes || null,
          certId,
        ]
      )

      // Notify the expert and the company
      const certInfo = await query(
        `SELECT cr.company_id, a.name as assessment_name
         FROM certification_requests cr JOIN assessments a ON a.id = cr.assessment_id
         WHERE cr.id = $1`, [certId]
      )
      if (certInfo.rows.length > 0) {
        const { company_id, assessment_name } = certInfo.rows[0]
        await createNotification(
          expertUserId,
          'cert_assigned',
          'Nouvelle certification à auditer',
          `Vous avez été assigné pour auditer : ${assessment_name}`,
          `/expert/certifications/${certId}`
        )
        await notifyCompanyUsers(
          company_id,
          'cert_assigned',
          'Expert assigné à votre certification',
          `${expert.first_name} ${expert.last_name} va auditer votre bilan "${assessment_name}"`,
          `/dashboard/certifications`
        )
      }
    } else if (action === 'in_progress') {
      await query(
        `UPDATE certification_requests SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
        [certId]
      )
    } else if (action === 'reject') {
      const { rejectionReason, adminNotes } = body
      await query(
        `UPDATE certification_requests
         SET status = 'rejected', rejection_reason = $1, admin_notes = $2, updated_at = NOW()
         WHERE id = $3`,
        [rejectionReason || null, adminNotes || null, certId]
      )
      const rInfo = await query(
        `SELECT cr.company_id, a.name as assessment_name
         FROM certification_requests cr JOIN assessments a ON a.id = cr.assessment_id
         WHERE cr.id = $1`, [certId]
      )
      if (rInfo.rows.length > 0) {
        await notifyCompanyUsers(
          rInfo.rows[0].company_id,
          'cert_rejected',
          'Demande de certification refusée',
          `Votre demande pour "${rInfo.rows[0].assessment_name}" a été refusée.`,
          `/dashboard/certifications`
        )
      }
    } else if (action === 'reschedule') {
      // Admin proposes a new inspection date (or confirms expert's proposal)
      const { scheduledDate, location, adminNotes } = body
      if (!scheduledDate) return NextResponse.json({ error: 'Date requise' }, { status: 400 })
      await query(
        `UPDATE certification_requests
         SET audit_scheduled_date = $1,
             audit_location = COALESCE($2, audit_location),
             admin_notes = COALESCE($3, admin_notes),
             inspection_confirmed = FALSE,
             inspection_proposed_date = NULL,
             inspection_proposed_by = NULL,
             updated_at = NOW()
         WHERE id = $4`,
        [scheduledDate, location || null, adminNotes || null, certId]
      )
      const rsInfo = await query(
        `SELECT cr.company_id, cr.expert_user_id, a.name as assessment_name
         FROM certification_requests cr JOIN assessments a ON a.id = cr.assessment_id
         WHERE cr.id = $1`, [certId]
      )
      if (rsInfo.rows.length > 0) {
        const { expert_user_id, company_id, assessment_name } = rsInfo.rows[0]
        const dateStr = new Date(scheduledDate).toLocaleDateString('fr-FR')
        if (expert_user_id) {
          await createNotification(
            expert_user_id,
            'cert_comment',
            'Nouvelle date d\'inspection planifiée',
            `L'admin a planifié votre inspection le ${dateStr} pour "${assessment_name}".`,
            `/expert/certifications/${certId}`
          )
        }
        await notifyCompanyUsers(
          company_id,
          'cert_comment',
          'Inspection planifiée',
          `Une visite d'inspection a été planifiée le ${dateStr} pour "${assessment_name}".`,
          `/dashboard/certifications`
        )
      }

    } else if (action === 'accept_proposal') {
      // Admin accepts expert's proposed date
      const { certId: _ } = body
      const propInfo = await query(
        `SELECT cr.inspection_proposed_date, cr.expert_user_id, cr.company_id, a.name as assessment_name
         FROM certification_requests cr JOIN assessments a ON a.id = cr.assessment_id
         WHERE cr.id = $1`, [certId]
      )
      if (propInfo.rows.length > 0 && propInfo.rows[0].inspection_proposed_date) {
        const { inspection_proposed_date, expert_user_id, company_id, assessment_name } = propInfo.rows[0]
        await query(
          `UPDATE certification_requests
           SET audit_scheduled_date = $1,
               inspection_confirmed = TRUE,
               inspection_proposed_date = NULL,
               inspection_proposed_by = NULL,
               updated_at = NOW()
           WHERE id = $2`,
          [inspection_proposed_date, certId]
        )
        const dateStr = new Date(inspection_proposed_date).toLocaleDateString('fr-FR')
        if (expert_user_id) {
          await createNotification(expert_user_id, 'cert_comment',
            'Votre proposition de date a été acceptée',
            `L'admin a accepté le ${dateStr} pour l'inspection de "${assessment_name}".`,
            `/expert/certifications/${certId}`
          )
        }
        await notifyCompanyUsers(company_id, 'cert_comment',
          'Inspection confirmée',
          `La date d'inspection du ${dateStr} a été confirmée pour "${assessment_name}".`,
          `/dashboard/certifications`
        )
      }

    } else if (action === 'notes') {
      const { adminNotes } = body
      await query(
        `UPDATE certification_requests SET admin_notes = $1, updated_at = NOW() WHERE id = $2`,
        [adminNotes, certId]
      )

    } else if (action === 'audit_done') {
      const { auditChecklist, inspectionNotes } = body
      await query(
        `UPDATE certification_requests
         SET status = 'audit_done',
             audit_checklist = $1,
             inspection_notes = $2,
             inspection_date = COALESCE(inspection_date, NOW()::DATE),
             updated_at = NOW()
         WHERE id = $3`,
        [
          auditChecklist ? JSON.stringify(auditChecklist) : null,
          inspectionNotes || null,
          certId,
        ]
      )

    } else if (action === 'certify') {
      const { adminNotes } = body
      const year = new Date().getFullYear()
      const random = Math.floor(100000 + Math.random() * 900000)
      const certificateNumber = `CT-GL-${year}-${random}`

      await query(
        `UPDATE certification_requests
         SET status = 'certified',
             certificate_number = $1,
             certified_at = NOW(),
             admin_notes = COALESCE($2, admin_notes),
             updated_at = NOW()
         WHERE id = $3`,
        [certificateNumber, adminNotes || null, certId]
      )
      await query(
        `UPDATE assessments SET status = 'completed', updated_at = NOW()
         WHERE id = (SELECT assessment_id FROM certification_requests WHERE id = $1)`,
        [certId]
      )
      const cInfo = await query(
        `SELECT cr.company_id, a.name as assessment_name, cr.certificate_number
         FROM certification_requests cr JOIN assessments a ON a.id = cr.assessment_id
         WHERE cr.id = $1`, [certId]
      )
      if (cInfo.rows.length > 0) {
        await notifyCompanyUsers(
          cInfo.rows[0].company_id,
          'cert_validated',
          '🎉 Bilan carbone certifié !',
          `Votre bilan "${cInfo.rows[0].assessment_name}" a été certifié (N° ${cInfo.rows[0].certificate_number}).`,
          `/dashboard/certifications`
        )
      }

      // Auto-generate expert audit report PDF
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
        await fetch(`${appUrl}/api/admin/certifications/${certId}/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': process.env.INTERNAL_API_KEY || 'carbontrack-internal',
          },
        })
      } catch (pdfErr) {
        console.error('Auto PDF generation failed (non-fatal):', pdfErr)
      }

    } else if (action === 'send_to_cnc') {
      const { cncUserId, adminNotes } = body
      if (!cncUserId) {
        return NextResponse.json({ error: 'Sélectionnez un membre CNC' }, { status: 400 })
      }

      const cncResult = await query(
        `SELECT first_name, last_name, email FROM users WHERE id = $1 AND role = 'cnc'`,
        [cncUserId]
      )
      if (cncResult.rows.length === 0) {
        return NextResponse.json({ error: 'Membre CNC introuvable' }, { status: 404 })
      }

      await query(
        `UPDATE certification_requests
         SET status = 'submitted_to_cnc',
             cnc_user_id = $1,
             submitted_to_cnc_at = NOW(),
             admin_notes = COALESCE($2, admin_notes),
             updated_at = NOW()
         WHERE id = $3`,
        [cncUserId, adminNotes || null, certId]
      )

      const scInfo = await query(
        `SELECT cr.company_id, a.name as assessment_name, c.name as company_name
         FROM certification_requests cr
         JOIN assessments a ON a.id = cr.assessment_id
         JOIN companies c ON c.id = cr.company_id
         WHERE cr.id = $1`, [certId]
      )
      if (scInfo.rows.length > 0) {
        const { company_id, assessment_name, company_name } = scInfo.rows[0]
        await createNotification(
          cncUserId,
          'cert_assigned',
          'Nouveau dossier à certifier',
          `Le dossier de ${company_name} — "${assessment_name}" vous a été soumis pour certification finale.`,
          `/cnc/certifications/${certId}`
        )
        await notifyCompanyUsers(
          company_id,
          'cert_comment',
          'Dossier soumis au CNC',
          `Votre dossier "${assessment_name}" a été soumis au Conseil National du Climat pour certification finale.`,
          `/dashboard/certifications`
        )
      }

    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin certification update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
