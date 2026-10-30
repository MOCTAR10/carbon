/**
 * Builds the Expert Audit Report PDF for a certification request.
 * Shared by the report download route and the full DGEPN dossier (ZIP) route.
 */

import { query } from '@/lib/db'
import { generateExpertReportPDF, AuditChecklistData, MonthRow } from '@/lib/documents/ExpertReportPDF'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

export class ReportUnavailableError extends Error {}

export async function buildExpertReport(certId: number): Promise<{ buffer: Buffer; filename: string }> {
  // ── Load certification data ─────────────────────────────────────────────
  const certResult = await query(
    `SELECT
       cr.id, cr.status, cr.company_id, cr.expert_user_id,
       cr.audit_checklist,
       cr.audit_scheduled_date, cr.audit_location,
       cr.inspection_date, cr.inspection_notes,
       cr.expert_name, cr.expert_email,
       cr.certified_at, cr.certificate_number,
       a.id as assessment_id,
       a.name as assessment_name,
       a.year as assessment_year,
       a.approach,
       a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq,
       c.name as company_name,
       c.sector, c.rccm, s.address as company_address
     FROM certification_requests cr
     JOIN assessments a ON a.id = cr.assessment_id
     JOIN sites s ON s.id = a.site_id
     JOIN companies c ON c.id = cr.company_id
     WHERE cr.id = $1`,
    [certId]
  )

  if (certResult.rows.length === 0) throw new ReportUnavailableError('Certification introuvable')
  const r = certResult.rows[0]
  if (!r.expert_name) throw new ReportUnavailableError('Aucun expert assigné — impossible de générer le rapport')

  // ── Map new JSONB checklist → ExpertReportPDF AuditChecklistData ────────
  const rawCl = r.audit_checklist as Record<string, Record<string, unknown>> | null
  const checklist: AuditChecklistData = {
    eligibility: {
      threshold_met:            Boolean(rawCl?.eligibility?.threshold_applicable ?? false),
      scope_1_2_complete:       Boolean(rawCl?.eligibility?.legal_entity_verified ?? false),
      scope_3_if_required:      Boolean(rawCl?.eligibility?.previous_declaration_exists ?? false),
      approach_confirmed:       'Contrôle opérationnel',
      legal_entity_registered:  Boolean(rawCl?.eligibility?.legal_entity_verified ?? false),
      period_covered:           String(r.assessment_year),
      notes:                    String(rawCl?.eligibility?.notes ?? ''),
    },
    data_quality: {
      activity_data_documented: Boolean(rawCl?.data_quality?.data_sources_documented ?? false),
      emission_factors_sourced: Boolean(rawCl?.data_quality?.emission_factors_appropriate ?? false),
      uncertainty_acceptable:   Boolean(rawCl?.data_quality?.consolidation_method_correct ?? false),
      no_significant_gaps:      Boolean(rawCl?.data_quality?.scope_boundaries_correct ?? false),
      monthly_data_available:   false,
      supporting_docs_provided: false,
      notes:                    String(rawCl?.data_quality?.notes ?? ''),
    },
    calculations: {
      method_conforms_iso14064: Boolean(rawCl?.calculations?.methodology_followed ?? false),
      unit_conversions_correct: Boolean(rawCl?.calculations?.scope1_verified ?? false),
      scope_totals_consistent:  Boolean(rawCl?.calculations?.scope2_verified ?? false),
      no_double_counting:       Boolean(rawCl?.calculations?.scope3_verified ?? false),
      emission_factors_current: Boolean(rawCl?.calculations?.methodology_followed ?? false),
      notes:                    String(rawCl?.calculations?.notes ?? ''),
    },
    site_visit: {
      site_visited:           Boolean(rawCl?.site_visit?.visit_conducted ?? false),
      visit_date:             String(rawCl?.site_visit?.visit_date ?? r.inspection_date ?? ''),
      sites_covered:          [String(rawCl?.site_visit?.visit_location ?? r.audit_location ?? r.company_address ?? 'Gabon')],
      processes_observed:     [],
      inconsistencies_found:  false,
      inconsistency_details:  '',
      photos_taken:           false,
      notes:                  String(rawCl?.site_visit?.notes ?? r.inspection_notes ?? ''),
    },
    ogec_compliance: {
      article_24_met:                        Boolean(rawCl?.ogec_compliance?.art24_applicable ?? false),
      article_25_content_complete:           Boolean(rawCl?.ogec_compliance?.art25_applicable ?? false),
      article_26_monitoring_plan:            Boolean(rawCl?.ogec_compliance?.art26_applicable ?? false),
      declaration_conformite_signed:         Boolean(rawCl?.ogec_compliance?.monitoring_plan_present ?? false),
      no_international_transfer_without_cnc: true,
      notes:                                 String(rawCl?.ogec_compliance?.notes ?? ''),
    },
    opinion: {
      recommendation:
        rawCl?.opinion?.overall_opinion === 'favorable'   ? 'favorable' :
        rawCl?.opinion?.overall_opinion === 'unfavorable' ? 'unfavorable' :
        (rawCl?.opinion?.overall_opinion === 'favorable_with_reservations' ||
         rawCl?.opinion?.overall_opinion === 'with_reservations')
          ? 'favorable_with_conditions'
          : 'favorable_with_conditions',
      conditions:           Array.isArray(rawCl?.opinion?.reservations) ? (rawCl!.opinion!.reservations as string[]) : [],
      corrections_required: [],
      overall_assessment:   String(rawCl?.opinion?.major_findings ?? ''),
      recommendations:      String(rawCl?.opinion?.recommendations ?? ''),
      expert_signature_date: new Date().toISOString().slice(0, 10),
    },
  }

  // ── Full emission entries ────────────────────────────────────────────────
  const entriesResult = await query(
    `SELECT id, scope, category, subcategory, factor_name,
            quantity, unit, factor_value, total_co2eq,
            month, ghg_category, description
     FROM emission_entries
     WHERE assessment_id = $1
     ORDER BY scope, category, factor_name`,
    [r.assessment_id]
  )
  const entries = entriesResult.rows.map((e: Record<string, unknown>) => ({
    id:          Number(e.id),
    scope:       Number(e.scope),
    category:    String(e.category ?? ''),
    subcategory: String(e.subcategory ?? ''),
    factorName:  String(e.factor_name ?? ''),
    quantity:    parseFloat(String(e.quantity)) || 0,
    unit:        String(e.unit ?? ''),
    factorValue: parseFloat(String(e.factor_value)) || 0,
    totalCo2eq:  parseFloat(String(e.total_co2eq)) || 0,
    month:       e.month ? Number(e.month) : null,
    ghgCategory: e.ghg_category ? String(e.ghg_category) : null,
    description: e.description  ? String(e.description)  : null,
  }))

  // ── Monthly breakdown ────────────────────────────────────────────────────
  const MONTH_LABELS = ['', 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
  const byMonth: MonthRow[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mes = entries.filter(e => e.month === m)
    return {
      month:  m,
      label:  MONTH_LABELS[m],
      total:  mes.reduce((s, e) => s + e.totalCo2eq, 0),
      scope1: mes.filter(e => e.scope === 1).reduce((s, e) => s + e.totalCo2eq, 0),
      scope2: mes.filter(e => e.scope === 2).reduce((s, e) => s + e.totalCo2eq, 0),
      scope3: mes.filter(e => e.scope === 3).reduce((s, e) => s + e.totalCo2eq, 0),
    }
  })

  // ── QR code + company logo ───────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://carbontrack.greenleaves.ga'
  const verifyUrl = r.certificate_number ? `${appUrl}/verify/${encodeURIComponent(r.certificate_number)}` : appUrl
  let qrCodeDataUrl: string | undefined
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: { dark: '#166534', light: '#ffffff' },
    })
  } catch { /* non-fatal */ }

  let companyLogoDataUrl: string | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logos', `company-${r.company_id}.png`)
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      companyLogoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
  } catch { /* non-fatal */ }

  let greenLeavesLogoDataUrl: string | null = null
  try {
    const glLogoPath = path.join(process.cwd(), 'public', 'greenleaves-logo.png')
    if (fs.existsSync(glLogoPath)) {
      const glBuffer = fs.readFileSync(glLogoPath)
      greenLeavesLogoDataUrl = `data:image/png;base64,${glBuffer.toString('base64')}`
    }
  } catch { /* non-fatal */ }

  // ── Generate PDF ─────────────────────────────────────────────────────────
  const pdfBuffer = await generateExpertReportPDF({
    certId,
    missionNumber:  `CT-AUDIT-${certId}-${new Date().getFullYear()}`,
    expertName:     r.expert_name,
    expertEmail:    r.expert_email ?? '',
    reportDate:     new Date().toISOString().slice(0, 10),
    companyName:    r.company_name,
    companySector:  r.sector ?? '',
    companyRccm:    r.rccm ?? '',
    assessmentName: r.assessment_name,
    assessmentYear: parseInt(r.assessment_year),
    approach:       r.approach ?? 'Contrôle opérationnel',
    totalCo2eq:     parseFloat(r.total_co2eq) || 0,
    scope1:         parseFloat(r.scope1_co2eq) || 0,
    scope2:         parseFloat(r.scope2_co2eq) || 0,
    scope3:         parseFloat(r.scope3_co2eq) || 0,
    inspectionDate:     r.inspection_date ?? null,
    inspectionLocation: r.audit_location ?? r.company_address ?? null,
    checklist,
    qrCodeDataUrl,
    companyLogoDataUrl,
    greenLeavesLogoDataUrl,
    entries,
    byMonth,
    status:            r.status ?? null,
    certifiedAt:       r.certified_at ?? null,
    certificateNumber: r.certificate_number ?? null,
  })

  const filename = `rapport-expert-certification-${certId}.pdf`
  await query(
    `UPDATE certification_requests SET expert_report_pdf_url = $1, updated_at = NOW() WHERE id = $2`,
    [`/generated/${filename}`, certId]
  )
  return { buffer: pdfBuffer, filename }
}
