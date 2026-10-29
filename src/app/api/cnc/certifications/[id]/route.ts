import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { createNotification, notifyCompanyUsers, notifyAllAdmins } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('cnc')
    if (!session || session.role !== 'cnc') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const certId = parseInt(params.id)
    const result = await query(
      `SELECT
         cr.id, cr.status, cr.requested_at, cr.updated_at,
         cr.inspection_notes, cr.inspection_date,
         cr.audit_checklist, cr.audit_scheduled_date, cr.audit_location,
         cr.inspection_confirmed, cr.inspection_proposed_date, cr.inspection_proposed_by,
         cr.submitted_to_ogec_at, cr.ogec_reference,
         cr.avis_number, cr.avis_date, cr.avis_pdf_url,
         cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
         cr.expert_report_pdf_url, cr.dossier_compiled_at,
         cr.certified_at, cr.certificate_number, cr.certificate_number as gl_certificate_number,
         cr.company_message, cr.admin_notes,
         cr.expert_name, cr.expert_email, cr.expert_user_id,
         cr.cnc_user_id, cr.submitted_to_ogec_at, cr.cnc_reviewed_at, cr.cnc_notes,
         cr.cnc_certificate_pdf_url, cr.cnc_certificate_generated_at, cr.cnc_certificate_number,
         a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
         a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
         a.approach,
         s.name as site_name, s.type as site_type, s.address as site_address,
         c.id as company_id, c.name as company_name, c.sector, c.rccm, c.logo_url
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.id = $1 AND cr.cnc_user_id = $2`,
      [certId, session.userId]
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

    const docsResult = await query(
      `SELECT id, doc_type, original_name, file_size, created_at
       FROM certification_documents WHERE certification_id = $1 ORDER BY created_at DESC`,
      [certId]
    )

    const auditDocsResult = await query(
      `SELECT ad.id, ad.emission_factor_id, ad.original_name, ad.filename, ad.file_size, ad.mime_type, ad.created_at,
              ee.factor_name, ee.category, ee.scope
       FROM audit_documents ad
       LEFT JOIN (
         SELECT DISTINCT ON (emission_factor_id) emission_factor_id, factor_name, category, scope
         FROM emission_entries
         WHERE assessment_id = $1
       ) ee ON ee.emission_factor_id = ad.emission_factor_id
       WHERE ad.assessment_id = $1
       ORDER BY ad.created_at DESC`,
      [r.assessment_id]
    )

    return NextResponse.json({
      id: r.id, status: r.status, requestedAt: r.requested_at, updatedAt: r.updated_at,
      inspectionDate: r.inspection_date, inspectionNotes: r.inspection_notes,
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
      certifiedAt: r.certified_at,
      glCertificateNumber: r.gl_certificate_number,
      companyMessage: r.company_message,
      adminNotes: r.admin_notes,
      expertName: r.expert_name, expertEmail: r.expert_email, expertUserId: r.expert_user_id,
      cncUserId: r.cnc_user_id,
      submittedToCncAt: r.submitted_to_ogec_at,
      cncReviewedAt: r.cnc_reviewed_at,
      cncNotes: r.cnc_notes,
      cncCertificatePdfUrl: r.cnc_certificate_pdf_url,
      cncCertificateGeneratedAt: r.cnc_certificate_generated_at,
      cncCertificateNumber: r.cnc_certificate_number,
      assessmentId: r.assessment_id, assessmentName: r.assessment_name, assessmentYear: r.assessment_year,
      approach: r.approach,
      totalCo2eq: r.total_co2eq, scope1: r.scope1_co2eq, scope2: r.scope2_co2eq, scope3: r.scope3_co2eq,
      siteName: r.site_name, siteType: r.site_type, siteAddress: r.site_address,
      companyId: r.company_id, companyName: r.company_name, sector: r.sector, rccm: r.rccm,
      companyLogoUrl: r.logo_url,
      entries, byMonth, byCategory,
      documents: docsResult.rows.map(d => ({
        id: d.id, docType: d.doc_type, originalName: d.original_name,
        fileSize: d.file_size, createdAt: d.created_at,
      })),
      auditDocuments: auditDocsResult.rows.map(d => ({
        id: d.id, scope: d.scope, category: d.category,
        factorName: d.factor_name, originalName: d.original_name,
        fileSize: d.file_size, mimeType: d.mime_type, createdAt: d.created_at,
      })),
    })
  } catch (error) {
    console.error('CNC cert detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('cnc')
    if (!session || session.role !== 'cnc') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const certId = parseInt(params.id)
    const body = await request.json()
    const { action } = body

    if (action === 'review') {
      const { cncNotes } = body
      await query(
        `UPDATE certification_requests
         SET cnc_notes = $1,
             cnc_reviewed_at = NOW(),
             updated_at = NOW()
         WHERE id = $2 AND cnc_user_id = $3`,
        [cncNotes || null, certId, session.userId]
      )

      const revInfo = await query(
        `SELECT cr.company_id, a.name as assessment_name, c.name as company_name
         FROM certification_requests cr
         JOIN assessments a ON a.id = cr.assessment_id
         JOIN companies c ON c.id = cr.company_id
         WHERE cr.id = $1`, [certId]
      )
      if (revInfo.rows.length > 0) {
        const { company_id, assessment_name, company_name } = revInfo.rows[0]
        await notifyCompanyUsers(
          company_id,
          'cert_comment',
          'Avis CNC enregistré',
          `Le CNC a enregistré son avis pour "${assessment_name}".`,
          `/dashboard/certifications`
        )
        await notifyAllAdmins(
          'cert_comment',
          'Avis CNC enregistré',
          `Le CNC a enregistré son avis pour "${assessment_name}" (${company_name}).`,
          `/admin/certifications/${certId}`
        )
      }
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CNC certification update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
