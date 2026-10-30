/**
 * GET|POST /api/certifications/[id]/tracking
 *
 * Streams the "Fiche de suivi" PDF of a certification request for the owning company.
 * Note: the dynamic segment is named [assessmentId] because it shares the folder with the
 * per-assessment status route, but here it carries the certification request id.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getCompanySession as getSession, parseId } from '@/lib/company'
import { query } from '@/lib/db'
import { CERT_STATUS_LABELS, CertStatus } from '@/lib/certification'
import { generateSuiviDemandePDF } from '@/lib/documents/SuiviDemandePDF'

export const dynamic = 'force-dynamic'

const ORDER: CertStatus[] = ['pending', 'assigned', 'in_progress', 'audit_done', 'submitted_to_cnc', 'certified']

export async function GET(_request: NextRequest, { params }: { params: { assessmentId: string } }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const certId = parseId(params.assessmentId)
    if (!certId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    const result = await query(
      `SELECT cr.*, a.name as assessment_name, a.year as assessment_year,
              a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
              s.name as site_name, c.name as company_name, c.rccm, c.sector
       FROM certification_requests cr
       JOIN assessments a ON a.id = cr.assessment_id
       JOIN sites s ON s.id = a.site_id
       JOIN companies c ON c.id = cr.company_id
       WHERE cr.id = $1 AND cr.company_id = $2`,
      [certId, session.companyId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }
    const r = result.rows[0]
    const status = r.status as CertStatus
    const rank = ORDER.indexOf(status)
    const reached = (st: CertStatus) => rank >= ORDER.indexOf(st)
    const auditDate = r.inspection_date ?? r.audit_scheduled_date

    let greenLeavesLogoDataUrl: string | null = null
    try {
      const logo = path.join(process.cwd(), 'public', 'greenleaves-logo.png')
      if (fs.existsSync(logo)) greenLeavesLogoDataUrl = `data:image/png;base64,${fs.readFileSync(logo).toString('base64')}`
    } catch { /* non-fatal */ }

    const buffer = await generateSuiviDemandePDF({
      certId,
      statusLabel: CERT_STATUS_LABELS[status] ?? status,
      rejected: status === 'rejected',
      rejectionReason: r.rejection_reason,
      companyName: r.company_name,
      companyRccm: r.rccm ?? '',
      companySector: r.sector ?? '',
      assessmentName: r.assessment_name,
      assessmentYear: parseInt(r.assessment_year),
      siteName: r.site_name,
      totalCo2eq: parseFloat(r.total_co2eq) || 0,
      scope1: parseFloat(r.scope1_co2eq) || 0,
      scope2: parseFloat(r.scope2_co2eq) || 0,
      scope3: parseFloat(r.scope3_co2eq) || 0,
      expertName: r.expert_name,
      certificateNumber: status === 'certified' ? r.certificate_number : null,
      steps: [
        { label: 'Demande déposée', done: true, date: r.requested_at },
        { label: 'Expert accrédité assigné', done: !!r.expert_user_id && reached('assigned'), date: null, detail: r.expert_name },
        {
          label: 'Audit terrain',
          done: reached('audit_done'),
          date: reached('audit_done') ? auditDate : null,
          detail: !reached('audit_done') && auditDate
            ? `Prévu le ${new Date(auditDate).toLocaleDateString('fr-FR')}${r.audit_location ? ` (${r.audit_location})` : ''}`
            : r.audit_location,
        },
        {
          label: 'Dossier déposé à la DGEPN par l\'expert',
          done: reached('submitted_to_cnc'),
          date: r.submitted_to_cnc_at,
          detail: r.cnc_deposit_reference ? `Réf. ${r.cnc_deposit_reference}` : null,
        },
        {
          label: 'Certificat DGEPN délivré',
          done: status === 'certified',
          date: status === 'certified' ? r.certified_at : null,
          detail: status === 'certified' && r.certificate_number ? `N° ${r.certificate_number}` : null,
        },
      ],
      generatedAt: new Date().toISOString(),
      greenLeavesLogoDataUrl,
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="suivi-demande-certification-${certId}.pdf"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Tracking PDF error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération de la fiche de suivi' }, { status: 500 })
  }
}

export const POST = GET
