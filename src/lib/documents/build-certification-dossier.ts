/**
 * Builds the certification dossier summary PDF (company, emissions, audit checklist, expert opinion)
 * that the expert deposits at the DGEPN. Used inside the full dossier ZIP.
 */

import { query } from '@/lib/db'
import { generateOGECDossierPDF, OGECDossierData } from '@/lib/documents/OGECDossierPDF'

export async function buildCertificationDossier(certId: number): Promise<Buffer> {
  // Load certification request + company + assessment
  const certResult = await query(
    `SELECT
       cr.id, cr.status, cr.certificate_number, cr.inspection_notes, cr.inspection_date,
       cr.audit_checklist, cr.audit_scheduled_date, cr.audit_location,
       cr.submitted_to_ogec_at, cr.ogec_reference, cr.dossier_compiled_at,
       cr.expert_name,
       cr.avis_number, cr.avis_date, cr.avis_period_start, cr.avis_period_end, cr.avis_total_co2eq,
       a.id as assessment_id, a.name as assessment_name, a.year as assessment_year,
       a.total_co2eq, a.scope1_co2eq, a.scope2_co2eq, a.scope3_co2eq, a.approach,
       c.name as company_name, c.sector, c.rccm
     FROM certification_requests cr
     JOIN assessments a ON a.id = cr.assessment_id
     JOIN companies c ON c.id = cr.company_id
     WHERE cr.id = $1`,
    [certId]
  )

  if (certResult.rows.length === 0) throw new Error('Certification introuvable')

  const cr = certResult.rows[0]

  // Load top emission sources
  const emissionsResult = await query(
    `SELECT scope, category, SUM(total_co2eq)::numeric as co2eq
     FROM emission_entries
     WHERE assessment_id = $1
     GROUP BY scope, category
     ORDER BY co2eq DESC
     LIMIT 10`,
    [cr.assessment_id]
  )

  const now = new Date().toLocaleDateString('fr-FR')

  const data: OGECDossierData = {
    certId,
    certificateNumber: cr.certificate_number ?? null,
    status:            cr.status,
    ogecReference:     cr.ogec_reference ?? null,
    dossierCompiledAt: cr.dossier_compiled_at ?? null,

    companyName:   cr.company_name,
    companySector: cr.sector ?? '',
    companyRccm:   cr.rccm ?? '',

    assessmentName: cr.assessment_name,
    assessmentYear: parseInt(cr.assessment_year),
    approach:       cr.approach ?? 'Contrôle opérationnel',
    totalCo2eq:     parseFloat(cr.total_co2eq ?? 0),
    scope1:         parseFloat(cr.scope1_co2eq ?? 0),
    scope2:         parseFloat(cr.scope2_co2eq ?? 0),
    scope3:         parseFloat(cr.scope3_co2eq ?? 0),

    expertName:          cr.expert_name ?? null,
    inspectionDate:      cr.inspection_date ?? null,
    auditScheduledDate:  cr.audit_scheduled_date ?? null,
    auditLocation:       cr.audit_location ?? null,
    auditChecklist:      cr.audit_checklist ?? null,
    inspectionNotes:     cr.inspection_notes ?? null,

    avisNumber:       cr.avis_number ?? null,
    avisDate:         cr.avis_date ?? null,
    avisPeriodStart:  cr.avis_period_start != null ? parseInt(cr.avis_period_start) : null,
    avisPeriodEnd:    cr.avis_period_end != null ? parseInt(cr.avis_period_end) : null,
    avisTotalCo2eq:   cr.avis_total_co2eq != null ? parseFloat(cr.avis_total_co2eq) : null,

    topEmissions: emissionsResult.rows.map(r => ({
      scope:    parseInt(r.scope),
      category: r.category,
      co2eq:    parseFloat(r.co2eq),
    })),

    generatedAt: now,
  }

  return generateOGECDossierPDF(data)
}
